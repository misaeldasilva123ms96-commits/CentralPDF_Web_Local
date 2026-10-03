"""Exercise mode changes against real PDF rendering and export, including history."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import re

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', '', html)
scripts = ['app/node_modules/pdf-lib/dist/pdf-lib.min.js',
           'assets/js/pdf-ingest.js',
           'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
           'assets/js/pdf-native-text.js', 'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
           'assets/js/ux-enhancements.js', 'assets/js/app.js',
           'assets/js/layout-controls.js', 'assets/js/foundation.js', 'assets/js/experience-0.15.js',
           'assets/js/stable-1.0.js', 'assets/js/header-settings-1.0.3.js',
           'assets/js/product-redesign-2.0.js']
html = html.replace('</body>', ''.join(f'<script src="/{name}"></script>' for name in scripts) + '''
<script type="module">
  import * as pdfjs from '/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
  window.pdfjsLib = pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = '/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
  window.testReady = true;
</script></body>''')


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/test')
        page.wait_for_function('window.testReady')
        page.wait_for_selector('#cp101SettingsButton')
        assert 'Central PDF' in page.title()
        page.locator('[data-tool="editPdf"].tool-card').click()
        page.evaluate('''async () => {
          const doc = await PDFLib.PDFDocument.create();
          const first=doc.addPage([420, 595]); first.drawText('Documento original', {x: 30, y: 540, size: 18}); first.drawText('Vizinho preservado', {x: 30, y: 490, size: 14});
          doc.addPage([420, 595]);
          await CentralPDFApp.openFilesInTool([new File([await doc.save()], 'modos.pdf', {type: 'application/pdf'})], 'editPdf');
        }''')
        page.locator('[data-editor-mode="advanced"]').click()
        page.locator('#editorOriginalText').click()
        page.wait_for_selector('#editorNativeList button')
        assert page.locator('#editorNativeList button').count() == 2
        page.wait_for_selector('#editorNativeLayer button')
        target=page.locator('#editorNativeLayer button').first.bounding_box()
        stage=page.locator('#editorStage').bounding_box()
        assert abs(target['x']-stage['x']-30*1.45)<3
        assert page.locator('#editorNativeLayer button').count()==2
        page.locator('#editorNativeLayer button').first.click()
        page.wait_for_selector('#editorNativeEdit:not([hidden])')
        popover=page.locator('#editorNativeEdit').bounding_box()
        selected=page.locator('#editorNativeLayer button').first.bounding_box()
        assert abs(popover['y']-selected['y']) < 3, (popover,selected)
        assert page.locator('#editorStage #editorNativeValue').count()==1
        page.locator('#editorNativeValue').fill('Documento revisado')
        page.locator('#editorNativeApply').click()
        page.wait_for_function("Object.values(PDFVisualEditor.exportProjectState().pages[0].nativeEdits || {}).includes('Documento revisado')")
        page.wait_for_function("document.querySelector('#editorNativeEdit').hidden === false")
        snapshot=page.evaluate('JSON.stringify(PDFVisualEditor.exportProjectState().pages)')
        page.locator('#editorCompare').click()
        page.wait_for_function("document.querySelector('#editorCompareStatus').textContent.startsWith('Página 1:')")
        assert page.locator('#editorCompareChanges del').inner_text()=='Documento original'
        assert page.locator('#editorCompareChanges ins').inner_text()=='Documento revisado'
        assert page.evaluate("document.querySelector('#editorCompareOriginal').toDataURL() !== document.querySelector('#editorCompareResult').toDataURL()")
        page.keyboard.press('Control+z')
        assert page.evaluate('JSON.stringify(PDFVisualEditor.exportProjectState().pages)')==snapshot
        for width in [1440,390]:
            page.set_viewport_size({'width':width,'height':1000})
            assert page.evaluate("document.querySelector('#editorCompareDialog').scrollWidth <= document.querySelector('#editorCompareDialog').clientWidth + 1")
        page.keyboard.press('Escape')
        assert not page.locator('#editorCompareDialog').is_visible()
        page.set_viewport_size({'width':1440,'height':1000})
        def exported():
            return page.evaluate('''async () => {
              const {bytes}=await PDFVisualEditor.exportPdf();
              const task=pdfjsLib.getDocument({data:bytes}); const doc=await task.promise;
              const result=[];
              for(let i=1;i<=doc.numPages;i++) result.push((await (await doc.getPage(i)).getTextContent()).items.map(x=>({text:x.str,transform:x.transform})));
              await task.destroy();return result;
            }''')
        result=exported()
        assert any(x['text']=='Documento revisado' for x in result[0]), result
        assert not any('original' in x['text'] for x in result[0]), result
        neighbor=next(x for x in result[0] if x['text']=='Vizinho preservado')
        assert neighbor['transform'][4:]==[30,490], neighbor
        page.locator('#editorUndo').click()
        assert any(x['text']=='Documento original' for x in exported()[0])
        page.locator('#editorRedo').click()
        assert any(x['text']=='Documento revisado' for x in exported()[0])
        page.locator('#editorDuplicatePage').click()
        page.locator('#editorReadOriginal').click()
        page.wait_for_selector('#editorNativeList button')
        page.locator('#editorNativeList button').first.click()
        page.locator('#editorNativeValue').fill('Cópia alterada')
        page.locator('#editorNativeApply').click()
        page.wait_for_function("Object.values(PDFVisualEditor.exportProjectState().pages[1].nativeEdits || {}).includes('Cópia alterada')")
        result=exported()
        assert any(x['text']=='Documento revisado' for x in result[0])
        assert any(x['text']=='Cópia alterada' for x in result[1])
        page.wait_for_function("document.querySelector('#editorNativeEdit').hidden === false")
        page.locator('#editorNativeValue').fill('Texto 漢')
        page.locator('#editorNativeApply').click()
        page.wait_for_function("document.querySelector('#editorNativeStatus').textContent.includes('não contém')")
        assert 'não contém' in page.locator('#editorNativeFeedback').inner_text()
        assert any(x['text']=='Cópia alterada' for x in exported()[1])
        page.locator('#editorNativeRestore').click()
        page.wait_for_function("Object.keys(PDFVisualEditor.exportProjectState().pages[1].nativeEdits || {}).length===0")
        assert any(x['text']=='Documento original' for x in exported()[1])
        page.locator('#editorStampPreset').select_option('REVISADO')
        page.locator('#editorAddStamp').click()
        assert any(x['text']=='REVISADO' for x in exported()[1])
        page.locator('#editorRotatePageRight').click()
        assert any(x['text']=='REVISADO' for x in exported()[1])
        page.locator('#editorOriginalText').click()
        page.wait_for_selector('#editorNativeLayer button')
        page.locator('#editorNativeLayer button').first.click()
        assert page.locator('#editorNativeValue').input_value()=='Documento original'
        page.locator('[data-editor-mode="simple"]').click()
        assert page.locator('#editorNativeLayer').is_hidden()
        page.locator('[data-editor-mode="advanced"]').click()
        # Adjacent text operators must retain the text cursor, including TJ spacing,
        # escaped literal strings and a zero-length replacement (real deletion).
        page.evaluate('''async () => {
          const {PDFDocument,PDFName,StandardFonts}=PDFLib;
          const original=await PDFDocument.create(), p=original.addPage();
          const font=await original.embedFont(StandardFonts.Helvetica);
          p.node.set(PDFName.of('Resources'),original.context.obj({Font:{F1:font.ref}}));
          const stream=original.context.flateStream('BT /F1 14 Tf 2 Tc 3 Tw 1 0 0 1 30 700 Tm [(Alpha) -20 ( Beta)] TJ (Next) Tj ET');
          p.node.set(PDFName.of('Contents'),original.context.register(stream));
          const bytes=await original.save();
          const task=pdfjsLib.getDocument({data:bytes.slice()});const rendered=await task.promise;
          const doc=await PDFDocument.load(bytes);const target=doc.getPage(0);
          const analysis=await PDFNativeText.inspect(target,await rendered.getPage(1),PDFLib,pdfjsLib);
          if(analysis.runs[0].text!=='Alpha Beta') throw Error('TJ extraction mismatch');
          PDFNativeText.apply(target,analysis,{[analysis.runs[0].id]:''},PDFLib);
          const out=pdfjsLib.getDocument({data:await doc.save()}), output=await out.promise;
          const before=(await (await rendered.getPage(1)).getTextContent()).items;
          const after=(await (await output.getPage(1)).getTextContent()).items;
          if(after.some(x=>x.str.includes('Alpha'))) throw Error('Old text still rendered');
          // Compare the following operator independently using the glyph metrics.
          const expected=30+(analysis.runs[0].glyphs.reduce((n,g)=>n+g.width,0)+20)*14/1000+10*2+3;
          const next=after.find(x=>x.str.replaceAll(' ','')==='Next');
          if(!next || Math.abs(next.transform[4]-expected)>0.01) throw Error('Following text moved: '+JSON.stringify({next,expected,before,after}));
          await out.destroy();await task.destroy();
        }''')
        page.evaluate('''async () => {
          const {PDFDocument,PDFName,StandardFonts}=PDFLib;
          const doc=await PDFDocument.create(),p=doc.addPage();
          const font=await doc.embedFont(StandardFonts.Helvetica);await font.embed();const dict=doc.context.lookup(font.ref);
          dict.set(PDFName.of('FirstChar'),doc.context.obj(65));
          dict.set(PDFName.of('LastChar'),doc.context.obj(68));
          dict.set(PDFName.of('Widths'),doc.context.obj(['A','B','C','D'].map(c=>font.widthOfTextAtSize(c,1000))));
          const cmap='begincmap 1 begincodespacerange <00> <FF> endcodespacerange 1 beginbfchar <41> <0041> endbfchar 1 beginbfrange <42> <44> [<0042> <0043> <0044>] endbfrange endcmap';
          dict.set(PDFName.of('ToUnicode'),doc.context.register(doc.context.flateStream(cmap)));
          p.node.set(PDFName.of('Resources'),doc.context.obj({Font:{F1:font.ref}}));
          p.node.set(PDFName.of('Contents'),doc.context.register(doc.context.flateStream(`BT /F1 14 Tf 17 TL 1 0 0 1 30 700 Tm (AA) Tj (BB) ' 3 2 (CC) " ET`)));
          const bytes=await doc.save(),original=await PDFDocument.load(bytes);
          const task=pdfjsLib.getDocument({data:bytes.slice()}),pdf=await task.promise;
          const analysis=await PDFNativeText.inspect(original.getPage(0),await pdf.getPage(1),PDFLib,pdfjsLib);
          if(analysis.runs.length!==3)throw Error('Quote operators missing');
          if(analysis.runs[1].geometry[0][1]!==683-14*.22)throw Error('Incorrect next-line geometry');
          // D is declared in the font but is not used anywhere on this page.
          const edits=Object.fromEntries(analysis.runs.map(r=>[r.id,'DD']));
          PDFNativeText.apply(original.getPage(0),analysis,edits,PDFLib);
          const outTask=pdfjsLib.getDocument({data:await original.save()}),out=await outTask.promise;
          const items=(await (await out.getPage(1)).getTextContent()).items.filter(x=>x.str.trim());
          if(items.length!==3 || items.some(x=>x.str.replaceAll(' ','')!=='DD'))throw Error('Declared font glyphs not replaced: '+JSON.stringify(items));
          if(items.map(x=>x.transform[5]).join(',')!=='700,683,666')throw Error('Quote line positioning changed');
          await task.destroy();await outTask.destroy();
          // CID Identity-H: a declared glyph outside the page text is also usable.
          const cid=await PDFDocument.create(),cp=cid.addPage();
          const unicode=cid.context.register(cid.context.flateStream('begincmap 1 begincodespacerange <0000> <FFFF> endcodespacerange 1 beginbfrange <0001> <0003> <0041> endbfrange endcmap'));
          const descendant=cid.context.obj({Type:'Font',Subtype:'CIDFontType2',BaseFont:'Helvetica',CIDSystemInfo:{Registry:PDFLib.PDFString.of('Adobe'),Ordering:PDFLib.PDFString.of('Identity'),Supplement:0},W:[1,[667,667,722]]});
          const cf=cid.context.register(cid.context.obj({Type:'Font',Subtype:'Type0',BaseFont:'Helvetica',Encoding:'Identity-H',DescendantFonts:[cid.context.register(descendant)],ToUnicode:unicode}));
          cp.node.set(PDFName.of('Resources'),cid.context.obj({Font:{F1:cf}}));
          cp.node.set(PDFName.of('Contents'),cid.context.register(cid.context.flateStream('BT /F1 14 Tf 1 0 0 1 30 700 Tm <0001> Tj ET')));
          const cb=await cid.save(),cdoc=await PDFDocument.load(cb),ct=pdfjsLib.getDocument({data:cb.slice()}),cr=await ct.promise;
          const ca=await PDFNativeText.inspect(cdoc.getPage(0),await cr.getPage(1),PDFLib,pdfjsLib);
          PDFNativeText.apply(cdoc.getPage(0),ca,{[ca.runs[0].id]:'C'},PDFLib);
          const cot=pdfjsLib.getDocument({data:await cdoc.save()}),cor=await cot.promise;
          if((await (await cor.getPage(1)).getTextContent()).items.map(x=>x.str).join('')!=='C')throw Error('CID glyph replacement failed');
          await ct.destroy();await cot.destroy();
        }''')
        page.evaluate('''async () => {
          const {PDFDocument,PDFName,StandardFonts}=PDFLib;
          async function fixture(properties) {
            const doc=await PDFDocument.create(),p=doc.addPage(),font=await doc.embedFont(StandardFonts.Helvetica);
            p.node.set(PDFName.of('Resources'),doc.context.obj({Font:{F1:font.ref},Properties:{P1:{ActualText:PDFLib.PDFString.of('Old')}}}));
            p.node.set(PDFName.of('Contents'),doc.context.register(doc.context.flateStream(`/Span ${properties} BDC BT /F1 14 Tf 1 0 0 1 30 700 Tm (Original) Tj ET EMC`)));
            const bytes=await doc.save(),loaded=await PDFDocument.load(bytes),task=pdfjsLib.getDocument({data:bytes.slice()}),pdf=await task.promise;
            return {loaded,task,page:await pdf.getPage(1)};
          }
          // Nested metadata, strings containing operators, arrays and booleans must
          // remain operands, not become text operations or inline-image markers.
          const f=await fixture('<< /MCID 0 /Lang (pt-BR) /Meta << /Visible true /Values [null false (BI Tj >>)] >> >>');
          const analysis=await PDFNativeText.inspect(f.loaded.getPage(0),f.page,PDFLib,pdfjsLib);
          if(analysis.runs.length!==1 || analysis.runs[0].text!=='Original')throw Error('Tagged text not recognized');
          PDFNativeText.apply(f.loaded.getPage(0),analysis,{[analysis.runs[0].id]:'Revisado'},PDFLib);
          const output=pdfjsLib.getDocument({data:await f.loaded.save()}),pdf=await output.promise;
          const items=(await (await pdf.getPage(1)).getTextContent()).items;
          if(items.map(x=>x.str).join('')!=='Revisado')throw Error('Tagged export mismatch');
          if(Math.abs(items[0].transform[4]-30)>.01 || Math.abs(items[0].transform[5]-700)>.01)throw Error('Tagged position changed');
          await output.destroy();await f.task.destroy();
          for(const properties of ['<< /ActualText (Old) >>','<< /Actual#54ext (Old) >>','/P1']) {
            const f=await fixture(properties);let rejected=false;
            try {await PDFNativeText.inspect(f.loaded.getPage(0),f.page,PDFLib,pdfjsLib);}
            catch(e){rejected=e.message.includes('ActualText');}
            await f.task.destroy();if(!rejected)throw Error('Stale ActualText must be rejected');
          }
        }''')
        # An embedded/custom font map may only expose the glyphs already present.
        # New Latin characters must still replace the source text with a declared
        # fallback font, preserving the following operator and page independence.
        page.evaluate('''async () => {
          const {PDFDocument,PDFName,StandardFonts}=PDFLib;
          const doc=await PDFDocument.create(),p=doc.addPage([420,595]);
          const font=await doc.embedFont(StandardFonts.Helvetica);await font.embed();
          const dict=doc.context.lookup(font.ref);
          dict.set(PDFName.of('FirstChar'),doc.context.obj(65));dict.set(PDFName.of('LastChar'),doc.context.obj(65));
          dict.set(PDFName.of('Widths'),doc.context.obj([667]));
          dict.set(PDFName.of('ToUnicode'),doc.context.register(doc.context.flateStream('begincmap 1 begincodespacerange <00> <FF> endcodespacerange 1 beginbfchar <41> <0041> endbfchar endcmap')));
          p.node.set(PDFName.of('Resources'),doc.context.obj({Font:{F1:font.ref}}));
          p.node.set(PDFName.of('Contents'),doc.context.register(doc.context.flateStream('BT /F1 14 Tf 1 0 0 1 30 540 Tm [(AAA) -5000] TJ (A) Tj ET')));
          await CentralPDFApp.openFilesInTool([new File([await doc.save()], 'fonte-limitada.pdf',{type:'application/pdf'})],'editPdf');
        }''')
        page.locator('[data-editor-mode="advanced"]').click()
        page.locator('#editorOriginalText').click()
        page.wait_for_selector('#editorNativeLayer button')
        page.locator('#editorNativeLayer button').first.click()
        page.locator('#editorNativeValue').fill('ybyf ação')
        page.locator('#editorNativeValue').press('Control+Enter')
        page.wait_for_function("document.querySelector('#editorNativeFeedback').textContent.includes('substituído com Helvetica')")
        result=exported()
        assert any(x['text']=='ybyf ação' for x in result[0]),result
        assert not any(x['text']=='AAA' for x in result[0]),result
        neighbor=next(x for x in result[0] if x['text']=='A')
        assert abs(neighbor['transform'][4]-128.014)<.01 and neighbor['transform'][5]==540,neighbor
        page.locator('#editorNativeRestore').click()
        page.wait_for_function("Object.keys(PDFVisualEditor.exportProjectState().pages[0].nativeEdits || {}).length===0")
        assert any(x['text']=='AAA' for x in exported()[0])
        for width, height in [(1440,1000),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors, errors
        browser.close()
        print('editor-native-text: real replacement, position, undo/redo, independent duplicates, encoding rejection and restoration passed')
finally:
    server.shutdown()
