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
           'assets/js/product-redesign-2.0.js', 'assets/js/workspace-modernization.js']
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
import base64
import io
from PIL import Image

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/tests/pdf-corpus/sw-harness.html')
        page.evaluate("async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;}")
        page.wait_for_function('navigator.serviceWorker.controller!==null')
        page.goto(f'http://127.0.0.1:{server.server_port}/test');page.wait_for_function('window.testReady')
        files=page.evaluate('''async () => {
          async function pdf(label,count){const doc=await PDFLib.PDFDocument.create();for(let n=0;n<count;n++){const p=doc.addPage([420,595]);p.drawText(`${label} ${n+1}`,{x:30,y:540,size:14});}return await doc.save();}
          const a=await pdf('Original',3),b=await pdf('Substituta',2),large=await pdf('Longo',80);
          window.modernFiles={a:new File([a],'João  documento.pdf',{type:'application/pdf'}),b:new File([b],'Páginas de reposição.pdf',{type:'application/pdf'}),large:new File([large],'Documento grande.pdf',{type:'application/pdf'})};
          const base64=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
          return {a:base64(a),b:base64(b)};
        }''')
        # Home drop uses real files, offers only compatible tools and does not navigate.
        page.evaluate('''()=>{const dt=new DataTransfer();dt.items.add(modernFiles.a);dt.items.add(modernFiles.b);document.body.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));}''')
        assert page.locator('#globalDropHint').is_visible()
        page.evaluate('''()=>{const dt=new DataTransfer();dt.items.add(modernFiles.a);dt.items.add(modernFiles.b);document.body.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));}''')
        assert page.locator('#globalImportDialog').is_visible()
        assert page.locator('[data-import-tool="imageConvert"]').count()==0
        page.locator('[data-import-tool="merge"]').click()
        page.wait_for_function("CentralPDFApp.getFiles().length===2 && document.querySelectorAll('#pageGrid .page-card').length===2")
        assert page.locator('#mergePageView').input_value()=='covers'
        assert '2 capas' in page.locator('#mergePlanCount').inner_text()
        assert '5' in page.locator('#mergePlanCount').get_attribute('title')
        page.locator('#outputFileName').fill('União de comprovação')
        with page.expect_download() as info:page.locator('#processButton').click()
        assert info.value.suggested_filename=='União de comprovação.pdf'
        saved=info.value.path()
        merged=list(Path(saved).read_bytes())
        assert page.evaluate('async bytes=>(await PDFLib.PDFDocument.load(new Uint8Array(bytes))).getPageCount()',merged)==5
        page.locator('#continueEditingButton').click()
        # Single-file tools preserve the loaded document on subsequent drops.
        page.evaluate("async()=>{await CentralPDFApp.openFilesInTool([modernFiles.a],'formBuilder');await CentralPDFApp.addFiles([modernFiles.b],{source:'drop'});}")
        assert page.evaluate('CentralPDFApp.getFiles()[0].name')=='João  documento.pdf'
        assert 'mantido' in page.locator('#statusBox').inner_text()
        page.evaluate("async()=>{CentralPDFApp.selectTool('split');await CentralPDFApp.addFiles([new File(['not a pdf'],'corrompido.pdf',{type:'application/pdf'})]);}")
        assert page.evaluate('CentralPDFApp.getFiles().length')==0
        assert page.locator('#statusBox').get_attribute('class').endswith('error')
        # The editor creates all navigation controls immediately, but renders a viewport.
        page.evaluate("async()=>await CentralPDFApp.openFilesInTool([modernFiles.large],'editPdf')")
        page.wait_for_selector('#editorThumbnailList button[data-rendered="true"]')
        assert page.locator('#editorThumbnailList button').count()==80
        assert page.locator('#editorThumbnailList button[data-rendered="true"]').count()<25
        assert page.locator('#editorThumbnailList canvas').evaluate_all('cs=>cs.some(c=>c.width===3 && c.height===4)')
        assert page.locator('#editorThumbnailList canvas').first.evaluate('c=>c.width')==216
        page.evaluate("async()=>await CentralPDFApp.openFilesInTool([modernFiles.a],'editPdf')")
        page.locator('[data-editor-mode="advanced"]').click()
        original=page.evaluate('PDFVisualEditor.exportProjectState().pages')
        page.locator('.editor-page-select').nth(0).check();page.locator('.editor-page-select').nth(1).check()
        page.locator('#editorRotateSelected').click()
        assert [p['width'] for p in page.evaluate('PDFVisualEditor.exportProjectState().pages')][:2]==[595,595]
        page.locator('#editorUndo').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages')==original
        page.locator('#editorThumbnailList button').first.focus();page.keyboard.press('Alt+ArrowDown')
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[1].id')==original[0]['id']
        page.locator('#editorUndo').click()
        page.evaluate('''()=>{
          const entries=document.querySelectorAll('.editor-thumbnail-entry'),dt=new DataTransfer();
          entries[0].dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt,bubbles:true}));
          entries[2].dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
        }''')
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[2].id')==original[0]['id']
        page.locator('#editorUndo').click();page.locator('#editorRedo').click();page.locator('#editorUndo').click()
        page.locator('#editorDeleteSelected').click()
        assert page.evaluate('PDFVisualEditor.getProjectSummary().pageCount')==1
        page.locator('#editorUndo').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages')==original
        # Replace just the second page after inspecting a real two-page PDF preview.
        page.locator('#editorThumbnailList button').nth(1).click()
        original_signature=page.evaluate('PDFVisualEditor.getProjectSummary().signature')
        page.locator('#editorReplacePage').click()
        page.locator('#editorReplacementInput').set_input_files({'name':'Reposição de página.pdf','mimeType':'application/pdf','buffer':base64.b64decode(files['b'])})
        page.wait_for_function("document.querySelector('#editorReplacementStatus').textContent.startsWith('Prévia pronta')")
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages')==original
        page.locator('#editorReplacementPage').fill('99')
        assert page.locator('#editorReplacementApply').is_disabled()
        page.locator('#editorReplacementPage').fill('2')
        page.wait_for_function("!document.querySelector('#editorReplacementApply').disabled")
        page.locator('#editorReplacementApply').click()
        def exported_text():
            return page.evaluate('''async()=>{
              const result=await PDFVisualEditor.exportPdf({silent:true}),task=pdfjsLib.getDocument({data:result.bytes}),doc=await task.promise,all=[];
              for(let i=1;i<=doc.numPages;i++)all.push((await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(''));
              await task.destroy();return all;
            }''')
        assert exported_text()==['Original 1','Substituta 2','Original 3']
        assert page.evaluate('PDFVisualEditor.getProjectSummary().signature')!=original_signature
        page.locator('#editorUndo').click();assert exported_text()==['Original 1','Original 2','Original 3']
        assert page.evaluate('PDFVisualEditor.getProjectSummary().signature')==original_signature
        page.locator('#editorRedo').click();assert exported_text()[1]=='Substituta 2'
        # Invalid append is transactional; closing a replacement leaves history intact.
        before=page.evaluate('PDFVisualEditor.exportProjectState().pages')
        failure=page.evaluate("async()=>{try{await PDFVisualEditor.addPdfPages([modernFiles.b,new File(['broken'],'inválido.pdf',{type:'application/pdf'})]);return false;}catch(e){return true;}}")
        assert failure and page.evaluate('PDFVisualEditor.exportProjectState().pages')==before
        page.locator('#editorReplacePage').click()
        page.locator('#editorReplacementInput').set_input_files({'name':'inválido.pdf','mimeType':'application/pdf','buffer':b'broken'})
        page.wait_for_function("!document.querySelector('#editorReplacementStatus').textContent.includes('Lendo')")
        assert page.locator('#editorReplacementApply').is_disabled()
        page.locator('#editorReplaceClose').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages')==before
        # Compact signature image, transforms, image replacement, and export/reopen.
        image_bytes=io.BytesIO();Image.new('RGB',(1000,240),'navy').save(image_bytes,format='PNG')
        payload={'name':'Assinatura João.png','mimeType':'image/png','buffer':image_bytes.getvalue()}
        page.locator('#editorImageInput').set_input_files(payload)
        page.wait_for_function('PDFVisualEditor.exportProjectState().pages[1].objects.length===1')
        obj=page.evaluate('PDFVisualEditor.exportProjectState().pages[1].objects[0]')
        assert obj['width']<=180 and obj['height']<=90
        assert page.locator('#editorContextControls').is_hidden()
        image=page.locator('.editor-image-object.selected')
        image.hover()
        rect=image.bounding_box();scale=rect['width']/obj['width']
        handle=image.locator('.handle-e').bounding_box()
        px=handle['x']+handle['width']/2;py=handle['y']+handle['height']/2
        page.mouse.move(px,py);page.mouse.down()
        page.mouse.move(px+(220-obj['width'])*scale,py,steps=4);page.mouse.up()
        resized=page.evaluate('PDFVisualEditor.exportProjectState().pages[1].objects[0]')
        image.hover()
        rect=image.bounding_box();scale=rect['width']/resized['width']
        px=rect['x']+rect['width']/2;py=rect['y']+rect['height']/2
        page.mouse.move(px,py);page.mouse.down()
        page.mouse.move(px+(45-resized['x'])*scale,py,steps=4);page.mouse.up()
        exported_object=page.evaluate('PDFVisualEditor.exportProjectState().pages[1].objects[0]')
        assert abs(exported_object['x']-45)<1,exported_object
        assert abs(exported_object['width']-220)<1,exported_object
        assert abs(exported_object['width']/exported_object['height']-1000/240)<.01
        assert page.locator('#editorContextControls').is_hidden()
        placement=page.evaluate("""async expected=>{
          const result=await PDFVisualEditor.exportPdf({silent:true}),task=pdfjsLib.getDocument({data:result.bytes}),doc=await task.promise;
          const ops=await (await doc.getPage(2)).getOperatorList();
          const stack=[],matrices=[];let ctm=[1,0,0,1,0,0];
          ops.fnArray.forEach((op,i)=>{
            if(op===pdfjsLib.OPS.save)stack.push([...ctm]);
            else if(op===pdfjsLib.OPS.restore)ctm=stack.pop();
            else if(op===pdfjsLib.OPS.transform)ctm=pdfjsLib.Util.transform(ctm,ops.argsArray[i]);
            else if(op===pdfjsLib.OPS.paintImageXObject)matrices.push([...ctm]);
          });
          await task.destroy();return matrices.find(m=>Math.abs(m[0]-expected.width)<.01&&Math.abs(m[4]-expected.x)<.01);
        }""",exported_object)
        assert placement and abs(placement[3]-exported_object['height'])<.01,placement
        before_reorder=page.evaluate('PDFVisualEditor.exportProjectState().pages')
        page.locator('#editorThumbnailList button').nth(1).focus();page.keyboard.press('Alt+ArrowDown')
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[2].objects[0].rotation')==0
        page.locator('#editorUndo').click();assert page.evaluate('PDFVisualEditor.exportProjectState().pages')==before_reorder

        page.locator('#editorReplacePage').click();page.locator('#editorReplacementInput').set_input_files(payload)
        page.wait_for_function("!document.querySelector('#editorReplacementApply').disabled")
        page.locator('#editorReplacementApply').click()
        assert exported_text()==['Original 1','','Original 3']
        page.locator('#editorUndo').click();assert exported_text()[1]=='Substituta 2'
        # Mobile editor keeps the properties panel after the document, not on top.
        page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo(0,0)')
        assert page.locator('.settings-panel').evaluate("el=>getComputedStyle(el).position")=='static'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#editorShowProperties').click();assert page.locator('#editorReturnToPage').evaluate('el=>document.activeElement===el')
        page.locator('#editorReturnToPage').click();assert page.locator('#editorShowProperties').evaluate('el=>document.activeElement===el')
        page.set_viewport_size({'width':1440,'height':1000})
        # Delay the real serialization boundary to prove safe cancellation and no duplicate run.
        page.wait_for_function("document.querySelectorAll('#editorThumbnailList button[data-rendered=\"true\"]').length===3")
        downloads=[];page.on('download',lambda download:downloads.append(download))
        page.evaluate('''()=>{const save=PDFLib.PDFDocument.prototype.save;window.originalSave=save;PDFLib.PDFDocument.prototype.save=async function(...args){window.saveWaiting=true;await new Promise(resolve=>window.releaseSave=resolve);return save.apply(this,args);};}''')
        page.locator('#processButton').click();page.wait_for_function('window.saveWaiting===true')
        assert page.locator('#progressTrack').get_attribute('aria-valuenow') is None
        duplicate=page.evaluate('async()=>await CentralPDFApp.processCurrentTool()')
        assert duplicate['ok'] is False
        page.locator('#cancelProcessing').click();page.evaluate('window.releaseSave()')
        page.wait_for_function("CentralPDFFoundation.getTasks()[0].status==='cancelled'")
        assert not downloads
        page.evaluate('()=>{PDFLib.PDFDocument.prototype.save=window.originalSave;}')
        # Reopen the complete editor offline using the prepared real local engines.
        page.context.set_offline(True);page.reload();page.wait_for_function('window.testReady')
        page.evaluate("async bytes=>await CentralPDFApp.openFilesInTool([new File([new Uint8Array(bytes)],'Documento offline.pdf',{type:'application/pdf'})],'editPdf')",list(base64.b64decode(files['a'])))
        page.locator('[data-editor-mode="advanced"]').click();page.locator('#editorOriginalText').click()
        page.wait_for_selector('#editorNativeLayer button')
        page.locator('#editorNativeLayer button').first.click();page.locator('#editorNativeValue').fill('Revisado offline')
        page.locator('#editorNativeApply').click()
        page.wait_for_function("PDFVisualEditor.exportProjectState().pages[0].nativeEdits && Object.keys(PDFVisualEditor.exportProjectState().pages[0].nativeEdits).length===1")
        assert exported_text()[0]=='Revisado offline'
        assert not errors,errors
        browser.close()
        print('ux-editor-modernization: global drop, covers/full export, lazy thumbnails, bulk history, reorder, PDF/image replacement, export and cancellation passed')
finally:
    server.shutdown()
