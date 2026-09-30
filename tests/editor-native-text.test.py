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
        page.locator('#editorNativeList button').first.click()
        page.locator('#editorNativeValue').fill('Documento revisado')
        page.locator('#editorNativeApply').click()
        page.wait_for_function("Object.values(PDFVisualEditor.exportProjectState().pages[0].nativeEdits || {}).includes('Documento revisado')")
        page.wait_for_function("document.querySelector('#editorNativeEdit').hidden === false")
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
        assert any(x['text']=='Cópia alterada' for x in exported()[1])
        page.locator('#editorNativeRestore').click()
        page.wait_for_function("Object.keys(PDFVisualEditor.exportProjectState().pages[1].nativeEdits || {}).length===0")
        assert any(x['text']=='Documento original' for x in exported()[1])
        page.locator('#editorStampPreset').select_option('REVISADO')
        page.locator('#editorAddStamp').click()
        assert any(x['text']=='REVISADO' for x in exported()[1])
        page.locator('#editorRotatePageRight').click()
        assert any(x['text']=='REVISADO' for x in exported()[1])
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
        for width, height in [(1440,1000),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors, errors
        browser.close()
        print('editor-native-text: real replacement, position, undo/redo, independent duplicates, encoding rejection and restoration passed')
finally:
    server.shutdown()
