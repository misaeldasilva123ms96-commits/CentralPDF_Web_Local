"""Write and format selected objects without the right settings sidebar."""
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

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/test');page.wait_for_function('window.testReady')
        assert 'Central PDF' in page.title()
        page.evaluate('''async()=>{
          const doc=await PDFLib.PDFDocument.create();
          doc.addPage([420,595]).drawText('Documento original',{x:30,y:540,size:18});
          window.contextFile=new File([await doc.save()],'João  edição contextual.pdf',{type:'application/pdf'});
          await CentralPDFApp.openFilesInTool([contextFile],'editPdf');
        }''')
        assert page.locator('#settingsTitle').inner_text()=='Documento e saída'
        page.locator('[data-editor-tool="text"]').click()
        page.locator('#editorInteractionCanvas').click(position={'x':90,'y':170})
        page.wait_for_selector('.editor-object.selected')
        original=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0]')
        if os.environ.get('CONTEXT_SCREENSHOTS'):
            page.screenshot(path=os.path.join(os.environ['CONTEXT_SCREENSHOTS'],'initial.png'))
        assert original['width'] <= 160 and original['height'] <= 30, original
        dock=page.locator('#editorContextControls')
        assert dock.count()==1 and dock.is_visible()
        assert page.locator('#editorTextValue').evaluate('el=>el===document.activeElement')
        assert page.locator('#settingsContent #editorTextValue').count()==0
        # Hide the right sidebar: all selected-object actions must still work.
        page.evaluate("document.body.classList.add('settings-collapsed')")
        page.wait_for_function("()=>{const a=document.querySelector('.editor-work-area').getBoundingClientRect(),d=document.querySelector('#editorContextControls').getBoundingClientRect();return d.left>=a.left&&d.right<=a.right;}")
        page.locator('#editorTextValue').fill('Revisão aprovada')
        page.locator('#editorFontFamily').select_option('Courier')
        page.locator('#editorFontSize').fill('20')
        page.locator('#editorTextColor').evaluate("el=>{el.value='#2146cc';el.dispatchEvent(new Event('change',{bubbles:true}));}")
        page.locator('#editorBold').check()
        page.locator('#editorItalic').check()
        page.locator('#editorTextAlign').select_option('center')
        text=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0]')
        assert text['text']=='Revisão aprovada' and text['fontFamily']=='Courier'
        assert text['fontSize']==20 and text['bold'] and text['italic'] and text['color']=='#2146cc'
        assert text['align']=='center'
        # A real pointer drag still moves the object and creates one undo step.
        before_drag=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].x')
        page.locator('.editor-text-content').hover()
        position=page.locator('.editor-text-content').bounding_box()
        px=position['x']+position['width']/2;py=position['y']+position['height']/2
        page.mouse.move(px,py);page.mouse.down();page.mouse.move(px+40,py+15,steps=4);page.mouse.up()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].x')>before_drag+5
        page.locator('#editorUndo').click()
        assert abs(page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].x')-before_drag)<.01
        page.locator('#editorObjectSizePanel summary').click()
        page.locator('#editorObjectWidth').fill('240');page.locator('#editorObjectWidth').dispatch_event('change')
        page.locator('#editorObjectRotation').fill('15');page.locator('#editorObjectRotation').dispatch_event('change')
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].rotation')==15
        page.locator('#editorUndo').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].rotation')==0
        page.locator('#editorRedo').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].rotation')==15
        page.locator('#editorObjectSizePanel summary').click()
        if os.environ.get('CONTEXT_SCREENSHOTS'):
            page.screenshot(path=os.path.join(os.environ['CONTEXT_SCREENSHOTS'],'desktop.png'))
        # Text remains editable when selected in advanced mode or by double click.
        page.locator('[data-editor-mode="advanced"]').click()
        page.locator('#editorContextDone').click()
        assert dock.is_hidden()
        page.locator('.editor-text-content').dblclick()
        assert dock.is_visible()
        assert page.locator('#editorTextValue').evaluate('el=>el===document.activeElement')
        page.locator('#editorTextValue').fill('Texto final revisado')
        page.evaluate("document.body.classList.remove('settings-collapsed')")
        page.locator('#outputFileName').fill('João  edição contextual')
        with page.expect_download() as download:page.locator('#processButton').click()
        assert download.value.suggested_filename=='João  edição contextual.pdf'
        data=list(Path(download.value.path()).read_bytes())
        exported=page.evaluate('''async bytes=>{
          const task=pdfjsLib.getDocument({data:new Uint8Array(bytes)});
          try{return (await (await (await task.promise).getPage(1)).getTextContent()).items.map(x=>x.str).join(' ');}
          finally{await task.destroy();}
        }''',data)
        assert 'Documento original' in exported and 'Texto final revisado' in exported,exported
        page.locator('#continueEditingButton').click()
        page.set_viewport_size({'width':390,'height':844})
        page.locator('[data-editor-mode="simple"]').click()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('.editor-text-content').dblclick()
        page.locator('#editorTextValue').fill('Edição no celular')
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0].text')=='Edição no celular'
        box=dock.bounding_box()
        assert box['x']>=0 and box['x']+box['width']<=390 and box['height']<=844*.55,box
        alignment=page.locator('#editorTextAlign').bounding_box()
        assert alignment['y']>=box['y'] and alignment['y']+alignment['height']<=box['y']+box['height'],alignment
        if os.environ.get('CONTEXT_SCREENSHOTS'):
            page.screenshot(path=os.path.join(os.environ['CONTEXT_SCREENSHOTS'],'mobile.png'))
            page.evaluate("document.body.dataset.theme='dark'")
            page.screenshot(path=os.path.join(os.environ['CONTEXT_SCREENSHOTS'],'mobile-dark.png'))
            page.evaluate("document.body.dataset.theme='light'")
        page.locator('#editorTextValue').focus();page.keyboard.press('Escape')
        assert dock.is_hidden()
        # Image selection exposes geometry, duplication and deletion in the same dock.
        page.evaluate('''async()=>{
          const canvas=document.createElement('canvas');canvas.width=300;canvas.height=70;
          canvas.getContext('2d').fillRect(0,0,300,70);
          const bytes=Uint8Array.from(atob(canvas.toDataURL().split(',')[1]),c=>c.charCodeAt(0));
          await PDFVisualEditor.addImages([new File([bytes],'Assinatura João.png',{type:'image/png'})]);
        }''')
        assert dock.is_visible() and page.locator('#editorTextControlsPanel').is_hidden()
        assert page.locator('#editorSelectedType').inner_text()=='Imagem'
        page.locator('#editorDuplicateObject').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==3
        page.locator('#editorDeleteObject').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==2
        page.locator('[data-editor-tool="brush"]').click()
        assert page.locator('#editorDrawingSettings').is_visible()
        assert page.locator('#editorSelectionPanel').is_hidden()
        # Returning to a tool must not leave duplicate IDs or double-bound actions.
        page.evaluate("async()=>{CentralPDFApp.selectTool('split');await CentralPDFApp.openFilesInTool([contextFile],'editPdf');}")
        page.locator('[data-editor-tool="text"]').click()
        page.locator('#editorInteractionCanvas').click(position={'x':80,'y':150})
        assert page.locator('#editorTextValue').count()==1
        assert page.locator('#editorDuplicateObject').count()==1
        page.locator('#editorDuplicateObject').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==2
        assert not errors,errors
        browser.close()
        print('editor-context-controls: compact text, focus, formatting, transforms, export, mobile and tool re-entry passed')
finally:
    server.shutdown();server.server_close()
