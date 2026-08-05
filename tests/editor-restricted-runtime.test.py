from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css='\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'])
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1400,'height':900})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('[data-tool="editPdf"].tool-card').click()
    page.evaluate("""() => {
      const active=new WeakSet();
      const makePage=()=>({
        rotate:0,
        getViewport:({scale=1,rotation=0}={})=>({width:595*scale,height:842*scale,rotation}),
        render:({canvasContext})=>{
          const canvas=canvasContext.canvas;
          if(active.has(canvas))throw new Error('Cannot use the same canvas during multiple render() operations.');
          active.add(canvas);let rejectPromise;let timer;
          const promise=new Promise((resolve,reject)=>{rejectPromise=reject;timer=setTimeout(()=>{active.delete(canvas);resolve();},25)});
          return {promise,cancel(){clearTimeout(timer);active.delete(canvas);const error=new Error('Rendering cancelled');error.name='RenderingCancelledException';rejectPromise(error);}};
        }
      });
      window.pdfjsLib={GlobalWorkerOptions:{workerSrc:'test-worker.mjs'},getDocument(){return {promise:Promise.resolve({numPages:1,getPage:async()=>makePage()}),destroy:async()=>{}}}};
      const pageModel={getSize:()=>({width:595,height:842}),drawImage(){},setCropBox(){},setRotation(){},drawText(){},drawRectangle(){},drawLine(){}};
      window.PDFLib={
        PDFDocument:{
          load:async()=>{const error=new Error('Input document to PDFDocument.load is encrypted.');error.name='EncryptedPDFError';throw error;},
          create:async()=>({addPage:()=>pageModel,embedPng:async()=>({}),embedFont:async()=>({}),copyPages:async()=>{throw new Error('copyPages must not be used for restricted PDFs')},save:async()=>new Uint8Array([1,2,3])})
        },
        StandardFonts:{Helvetica:'Helvetica'},rgb:()=>({}),degrees:value=>value
      };
    }""")
    page.evaluate("PDFVisualEditor.loadFile(new File([new Uint8Array([1,2,3])],'restrito.pdf',{type:'application/pdf'}))")
    page.wait_for_function("PDFVisualEditor.hasDocument()")
    page.wait_for_function("document.querySelector('#editorStatus').textContent.includes('modo compatível')")
    page.evaluate("""() => { const zoom=document.querySelector('#editorZoom'); for(const value of [90,110,80,125,100]){zoom.value=value;zoom.dispatchEvent(new Event('input',{bubbles:true}));} }""")
    page.wait_for_timeout(120)
    result=page.evaluate("PDFVisualEditor.exportPdf().then(result=>({length:result.bytes.length,message:result.message}))")
    assert result['length']==3
    assert 'achatadas' in result['message']
    assert not any('same canvas' in error.lower() for error in errors), errors
    assert not errors, errors
    print('editor-restricted-runtime: passed')
    browser.close()
