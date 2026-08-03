from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css='\n'.join((root/name).read_text(encoding='utf-8') for name in [
    'assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'
])
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/name).read_text(encoding='utf-8') for name in [
    'assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js',
    'assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'
])
html=html.replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1600,'height':1000})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('[data-tool="editPdf"].tool-card').click()
    page.evaluate("""
      window.pdfjsLib={
        GlobalWorkerOptions:{workerSrc:'test-worker.mjs'},
        getDocument(){return {promise:Promise.resolve({
          numPages:1,
          getPage:async()=>({
            rotate:90,
            getViewport:({scale=1,rotation=90}={})=>{
              const landscape=((rotation%180)+180)%180===90;
              return {width:(landscape?842:595)*scale,height:(landscape?595:842)*scale};
            },
            render:()=>({promise:Promise.resolve()})
          })
        })}}
      };
      window.PDFLib={PDFDocument:{load:async()=>({})}};
    """)
    page.evaluate("PDFVisualEditor.loadFile(new File([new Uint8Array([1,2,3])],'paisagem.pdf',{type:'application/pdf'}))")
    page.wait_for_function("PDFVisualEditor.hasDocument()")
    page.evaluate("window.CentralPDFUX.updateStage(2)")
    page.wait_for_selector('#editorRotatePageLeft', state='attached')
    page.wait_for_selector('#editorRotatePageRight', state='attached')

    info=page.locator('#editorCurrentPageInfo')
    assert 'Paisagem' in info.inner_text()
    stage=page.locator('#editorStage').bounding_box()
    assert stage and stage['width']>stage['height']
    assert 'Paisagem' in page.locator('.editor-thumbnail span').inner_text()

    page.evaluate("document.querySelector('#editorRotatePageRight').click()")
    page.wait_for_function("document.querySelector('#editorCurrentPageInfo').textContent.includes('Retrato')")
    stage=page.locator('#editorStage').bounding_box()
    assert stage and stage['height']>stage['width']

    page.evaluate("document.querySelector('#editorRotatePageLeft').click()")
    page.wait_for_function("document.querySelector('#editorCurrentPageInfo').textContent.includes('Paisagem')")
    stage=page.locator('#editorStage').bounding_box()
    assert stage and stage['width']>stage['height']

    assert not errors, errors
    print('editor-page-orientation: passed')
    browser.close()
