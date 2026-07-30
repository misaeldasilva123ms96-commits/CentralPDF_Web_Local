from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'assets/css/styles.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/ux-redesign.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/layout-controls.css').read_text(encoding='utf-8')
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/n).read_text(encoding='utf-8') for n in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1600,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('[data-tool="editPdf"].tool-card').click()
    page.evaluate("""
      window.pdfjsLib={
        GlobalWorkerOptions:{},
        getDocument(){return {promise:Promise.resolve({
          numPages:1,
          getPage:async()=>({
            getViewport:({scale=1}={})=>({width:595*scale,height:842*scale}),
            render:()=>({promise:Promise.resolve()})
          })
        })}}
      };
      window.PDFLib={PDFDocument:{load:async()=>({})}};
    """)
    page.evaluate("PDFVisualEditor.loadFile(new File([new Uint8Array([1,2,3])],'teste.pdf',{type:'application/pdf'}))")
    page.wait_for_function("PDFVisualEditor.hasDocument()")
    page.evaluate("window.CentralPDFUX.updateStage(2)")
    page.locator('[data-editor-tool="text"]').click()
    stage=page.locator('#editorStage').bounding_box()
    assert stage
    page.mouse.click(stage['x']+180,stage['y']+180)
    page.wait_for_selector('.editor-object.selected')
    page.wait_for_timeout(120)
    assert page.locator('.editor-object.selected .editor-transform-handle').count()==8
    assert page.locator('.editor-object.selected .editor-rotate-handle').count()==1
    assert page.locator('#editorObjectSizePanel:not(.hidden)').count()==1

    original_width=float(page.locator('#editorObjectWidth').input_value())
    page.evaluate("""() => {
      const handle=document.querySelector('.editor-object.selected .handle-e');
      const rect=handle.getBoundingClientRect();
      const x=rect.left+rect.width/2, y=rect.top+rect.height/2;
      handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:1,button:0,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:x+70,clientY:y,pointerId:1,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x+70,clientY:y,pointerId:1,button:0}));
    }""")
    resized_width=float(page.locator('#editorObjectWidth').input_value())
    assert resized_width>original_width+10

    before_x=float(page.locator('#editorObjectX').input_value())
    page.evaluate("""() => {
      const handle=document.querySelector('.editor-object.selected .handle-w');
      const rect=handle.getBoundingClientRect();
      const x=rect.left+rect.width/2, y=rect.top+rect.height/2;
      handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:2,button:0,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:x-40,clientY:y,pointerId:2,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x-40,clientY:y,pointerId:2,button:0}));
    }""")
    after_x=float(page.locator('#editorObjectX').input_value())
    assert after_x<before_x

    page.evaluate("""() => {
      const handle=document.querySelector('.editor-object.selected .editor-rotate-handle');
      const h=handle.getBoundingClientRect();
      const obj=document.querySelector('.editor-object.selected').getBoundingClientRect();
      const x=h.left+h.width/2, y=h.top+h.height/2;
      const tx=obj.right+45, ty=obj.top+obj.height/2;
      handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:3,button:0,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:tx,clientY:ty,pointerId:3,buttons:1}));
      window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:tx,clientY:ty,pointerId:3,button:0}));
    }""")
    angle=abs(float(page.locator('#editorObjectRotation').input_value()))
    assert angle>=45

    page.locator('#editorResetRotation').click()
    assert float(page.locator('#editorObjectRotation').input_value())==0
    page.locator('#editorRotateRight').click()
    assert abs(float(page.locator('#editorObjectRotation').input_value()))==90

    page.locator('[data-editor-tool="crop"]').click()
    stage=page.locator('#editorStage').bounding_box()
    page.mouse.move(stage['x']+80,stage['y']+100)
    page.mouse.down()
    page.mouse.move(stage['x']+330,stage['y']+420,steps=6)
    page.mouse.up()
    page.wait_for_selector('.editor-crop-selection')
    assert page.locator('.editor-crop-selection .editor-transform-handle').count()==8

    assert not errors, errors
    print('editor-transform: passed')
    browser.close()
