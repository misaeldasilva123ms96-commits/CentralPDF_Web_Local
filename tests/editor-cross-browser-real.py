"""Real editor controls in Chromium and Firefox, desktop/tablet/mobile viewports."""
import argparse,json,math
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--site',type=Path,required=True);p.add_argument('--report',type=Path,required=True);args=p.parse_args()
class H(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(args.site.resolve())))
Thread(target=server.serve_forever,daemon=True).start();rows=[]
try:
    with sync_playwright() as p:
        for name in ['chromium','firefox']:
            browser=getattr(p,name).launch(headless=True)
            for width,height in [(1440,1000),(768,1024),(390,844)]:
                context=browser.new_context(viewport={'width':width,'height':height},has_touch=name=='chromium')
                page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.PDFVisualEditor')
                page.evaluate('''async()=>{
                  const pdf=await PDFLib.PDFDocument.create();for(let i=0;i<8;i++)pdf.addPage([420,595]).drawText('Pagina '+(i+1));
                  await CentralPDFApp.openFilesInTool([new File([await pdf.save()],'Editor São Paulo.pdf',{type:'application/pdf'})],'editPdf');
                  const c=document.createElement('canvas');c.width=300;c.height=70;c.getContext('2d').fillRect(0,0,300,70);
                  await PDFVisualEditor.addImages([new File([await new Promise(r=>c.toBlob(r))],'Imagem.png',{type:'image/png'})]);
                  document.body.classList.add('settings-collapsed');
                }''')
                initial=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0]')
                assert initial['width']<=180 and initial['height']<=90
                if width<800:page.locator('#editorZoom').evaluate("e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));}")
                for mode in ['simple','advanced']:
                    page.locator(f'[data-editor-mode="{mode}"]').click()
                    for theme in ['light','dark']:
                        page.evaluate('(theme)=>document.body.dataset.theme=theme',theme)
                        image=page.locator('.editor-image-object');image.hover();image.click()
                        assert page.locator('#editorContextControls').is_hidden()
                        assert page.locator('.editor-transform-handle').count()==8
                        actions=page.locator('#editorImageActions')
                        if not actions.evaluate('e=>e.open'):actions.locator(':scope > summary').click()
                        click=lambda loc:loc.tap() if name=='chromium' else loc.click()
                        click(page.locator('#editorDuplicateObject'))
                        assert page.evaluate('PDFVisualEditor.getProjectSummary().objectCount')==2
                        click(page.locator('#editorDeleteObject'))
                        assert page.evaluate('PDFVisualEditor.getProjectSummary().objectCount')==1
                        expect(page.locator('.editor-image-object')).to_have_count(1)
                        image=page.locator('.editor-image-object');image.hover();image.click()
                        assert actions.bounding_box()['y']+actions.bounding_box()['height']<=page.locator('.editor-scroll-area').bounding_box()['y']+1
                        click(actions.locator(':scope > summary'))
                # Move and resize through the actual pointer handles, not inspector state.
                image=page.locator('.editor-image-object');image.hover()
                rect=image.bounding_box();x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
                page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+15,y+5,steps=4);page.mouse.up()
                handle=page.locator('.editor-image-object.selected .handle-e');handle.hover();rect=handle.bounding_box()
                x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
                page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+20,y,steps=4);page.mouse.up()
                before_keys=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0]')
                assert before_keys['width']>initial['width']
                assert before_keys['x']>initial['x']
                assert abs(before_keys['width']/before_keys['height']-300/70)<.01
                # Keyboard transform and exported model retain geometry across a real export.
                page.keyboard.press('ArrowRight');page.keyboard.press('Alt+ArrowRight')
                exported=page.evaluate('''async()=>{const state=PDFVisualEditor.exportProjectState();const result=await PDFVisualEditor.exportPdf();const pdf=await PDFLib.PDFDocument.load(result.bytes);const task=pdfjsLib.getDocument({data:result.bytes.slice()});const doc=await task.promise;const ops=await (await doc.getPage(1)).getOperatorList();let ctm=[1,0,0,1,0,0];const stack=[],images=[];ops.fnArray.forEach((op,i)=>{if(op===pdfjsLib.OPS.save)stack.push([...ctm]);else if(op===pdfjsLib.OPS.restore)ctm=stack.pop();else if(op===pdfjsLib.OPS.transform)ctm=pdfjsLib.Util.transform(ctm,ops.argsArray[i]);else if(op===pdfjsLib.OPS.paintImageXObject)images.push([...ctm]);});await task.destroy();return {pages:pdf.getPageCount(),objects:state.pages[0].objects,images};}''')
                assert exported['pages']==8 and len(exported['objects'])==1
                assert exported['objects'][0]['rotation']==1
                assert exported['objects'][0]['width']==before_keys['width']
                obj=exported['objects'][0];matrix=exported['images'][-1]
                assert abs(math.hypot(matrix[0],matrix[1])-obj['width'])<.01
                assert abs(math.hypot(matrix[2],matrix[3])-obj['height'])<.01
                assert abs(matrix[4]+(matrix[0]+matrix[2])/2-(obj['x']+obj['width']/2))<.01
                assert abs(matrix[5]+(matrix[1]+matrix[3])/2-(595-obj['y']-obj['height']/2))<.01
                # Rapid real page navigation must finish at the last chosen thumbnail.
                page.evaluate("()=>{const list=document.querySelectorAll('#editorThumbnailList .editor-thumbnail');for(const i of [1,5,2,6,0])list[i]?.click();}")
                page.wait_for_function("document.querySelector('#editorPageIndicator').textContent.startsWith('1 /')")
                assert not errors,errors
                page.screenshot(path=str(args.report.parent/f'editor-{name}-{width}.png'))
                rows.append({'browser':name,'viewport':[width,height],'modes':['simple','advanced'],'themes':['light','dark'],'ok':True,'pageErrors':errors,'touch':name=='chromium'})
                context.close()
            browser.close()
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(rows,indent=2));print('Real cross-browser editor:',len(rows),'viewport runs passed')
finally:server.shutdown()
