"""PNG alpha stays visible over the selected paper background, including export."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from ux_browser_support import LocalEngineHandler
ROOT=Path(__file__).resolve().parents[1]
s=ThreadingHTTPServer(('127.0.0.1',0),partial(LocalEngineHandler,directory=str(ROOT)));Thread(target=s.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   b=getattr(p,engine).launch();c=b.new_context();c.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false')");c.route('https://**/*',lambda r:r.abort());page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
   page.evaluate("""async()=>{const c=document.createElement('canvas');c.width=80;c.height=120;const x=c.getContext('2d');x.fillStyle='#22aa66';x.fillRect(10,10,60,100);await CentralPDFApp.openFilesInTool([new File([await new Promise(r=>c.toBlob(r,'image/png'))],'Transparência.png',{type:'image/png'})],'imagesToPdf');window.alphaOutputs=[];addEventListener('centralpdf-result',e=>alphaOutputs.push(e.detail));HTMLAnchorElement.prototype.click=function(){};}""")
   page.wait_for_selector('.ux-image-paper img')
   alpha=page.locator('.ux-image-paper img').evaluate("img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(1,1,1,1).data[3];}")
   assert alpha==0,(engine,'Transparent source was flattened in the preview',alpha)
   # The paper must fit its cover at both ends of the existing thumbnail slider.
   page.locator('#imagePageMode').select_option('a4')
   page.locator('[data-setting="imageOrientation"][data-value="portrait"]').click()
   for width in [1440,390]:
    page.set_viewport_size({'width':width,'height':900})
    for key in ['Home','End']:
     page.locator('#coverZoom').focus();page.keyboard.press(key)
     page.wait_for_selector('.ux-image-paper')
     fit=page.locator('.ux-image-paper').evaluate("p=>{const a=p.getBoundingClientRect(),c=p.closest('.file-card-cover'),r=c.getBoundingClientRect(),s=getComputedStyle(c);return {top:a.top,bottom:a.bottom,left:a.left,right:a.right,ct:r.top+parseFloat(s.paddingTop),cb:r.bottom-parseFloat(s.paddingBottom),cl:r.left+parseFloat(s.paddingLeft),cr:r.right-parseFloat(s.paddingRight)};}")
     assert fit['top']>=fit['ct']-1 and fit['bottom']<=fit['cb']+1 and fit['left']>=fit['cl']-1 and fit['right']<=fit['cr']+1,(engine,width,key,fit)
   page.set_viewport_size({'width':1440,'height':900})
   page.locator('#imagePageMode').select_option('image');page.locator('[data-setting="imageOrientation"][data-value="auto"]').click()
   page.locator('[data-setting="imageMargin"][data-value="0"]').click();page.get_by_role('button',name='Personalizada',exact=True).click()
   page.locator('#imageBackground').evaluate("e=>{e.value='#334455';e.dispatchEvent(new Event('change',{bubbles:true}));}")
   assert page.locator('.ux-image-paper').evaluate('p=>getComputedStyle(p).backgroundColor')=='rgb(51, 68, 85)'
   # Check actual CSS compositing, not just source alpha and the parent separately.
   rendered=Image.open(BytesIO(page.locator('.ux-image-paper img').screenshot())).convert('RGB')
   assert rendered.getpixel((2,2))==(51,68,85),(engine,'Transparent preview corner covers the selected paper color',rendered.getpixel((2,2)))
   page.locator('#processButton').click();page.wait_for_function('alphaOutputs.length===1')
   pixel=page.evaluate("""async()=>{const t=pdfjsLib.getDocument({data:new Uint8Array(await alphaOutputs[0].blob.arrayBuffer())});try{const d=await t.promise;const p=await d.getPage(1),v=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;const x=c.getContext('2d');await p.render({canvasContext:x,viewport:v}).promise;return [...x.getImageData(1,1,1,1).data];}finally{await t.destroy();}}""")
   assert pixel==[51,68,85,255],(engine,pixel)
   c.close();b.close()
finally:s.shutdown()
print('image-paper-preview: transparent PNG preview and actual colored PDF background passed in Chromium/Firefox')
