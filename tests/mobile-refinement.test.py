"""Real mobile refinement: import transition, one action, selection and PDF parity."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from ux_browser_support import LocalEngineHandler
ROOT=Path(__file__).resolve().parents[1]
s=ThreadingHTTPServer(('127.0.0.1',0),partial(LocalEngineHandler,directory=str(ROOT)))
Thread(target=s.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   b=getattr(p,engine).launch()
   c=b.new_context(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce')
   c.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false')")
   c.route('https://**/*',lambda r:r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
   page.evaluate("CentralPDFApp.selectTool('imagesToPdf')")
   empty_height=page.locator('#dropzone').bounding_box()['height']
   page.evaluate("""async()=>{const c=document.createElement('canvas');c.width=120;c.height=80;c.getContext('2d').fillRect(10,10,100,60);window.refImage=new File([await new Promise(r=>c.toBlob(r))],'Transparência.png',{type:'image/png'});await CentralPDFApp.openFilesInTool([refImage],'imagesToPdf');}""")
   page.wait_for_selector('.ux-image-paper')
   assert page.locator('#dropzone').bounding_box()['height']<empty_height-10,'Import must compact the dropzone'
   assert page.locator('#addMoreFiles').is_visible()
   page.locator('[data-setting="imageOrientation"][data-value="landscape"]').click()
   assert page.locator('[data-setting="imageOrientation"][data-value="landscape"]').evaluate('e=>e===document.activeElement')
   assert page.locator('#imageOrientation').input_value()=='landscape'
   # Same real action is reachable without scrolling through all settings.
   button=page.locator('#processButton');assert button.count()==1 and not button.is_disabled()
   rect=button.bounding_box();assert 0<=rect['y'] and rect['y']+rect['height']<=844,(engine,rect)
   page.evaluate("document.body.classList.add('settings-collapsed')")
   assert button.is_visible(),'Collapsing settings must keep the same final action reachable'
   assert page.locator('#imagePageMode').is_hidden()
   page.evaluate("document.body.classList.remove('settings-collapsed')")
   if engine=='chromium':
    session=c.new_cdp_session(page);session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2})
    page.wait_for_function('visualViewport.scale===2')
    page.wait_for_function('document.querySelector("#processButton").getBoundingClientRect().right<=visualViewport.offsetLeft+visualViewport.width+1')
    session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})
    page.wait_for_function('visualViewport.scale===1')
   # Reduced visible height approximates keyboard space; a physical IME is separate QA.
   page.locator('#imagePageMode').select_option('custom')
   page.set_viewport_size({'width':390,'height':420})
   page.locator('#imageCustomWidth').focus()
   page.wait_for_function('document.querySelector("#imageCustomWidth").getBoundingClientRect().bottom<document.querySelector(".action-dock").getBoundingClientRect().top')
   page.locator('#imageCustomWidth').fill('180')
   assert page.locator('#imageCustomWidth').evaluate('e=>e===document.activeElement')
   page.set_viewport_size({'width':390,'height':844})
   page.set_viewport_size({'width':1440,'height':900})
   order=page.evaluate("""()=>['[data-setting="imageOrientation"]','#imagePageMode','[data-setting="imageMargin"]','#imageMergeAll','#imageOutputSummary','#processButton','#imageAdvanced'].map(s=>document.querySelector(s).getBoundingClientRect().top)""")
   assert order==sorted(order),(engine,order)
   print(engine,'image transition, footer zoom/keyboard space and settings order passed',flush=True)
   page.set_viewport_size({'width':390,'height':844})
   page.evaluate("""async()=>{const d=await PDFLib.PDFDocument.create();const p=d.addPage([420,595]);p.drawText('ORIGINAL PRESERVADO',{x:30,y:535});window.refPdf=new File([await d.save()],'Sintético.pdf',{type:'application/pdf'});await CentralPDFApp.openFilesInTool([refPdf],'editPdf');}""")
   page.locator('#editorAddText').click();page.locator('#editorInteractionCanvas').click(position={'x':90,'y':150})
   dock=page.locator('#editorContextControls');dock.wait_for(state='visible');page.locator('#editorTextValue').fill('Revisão: ação e coração')
   original=page.evaluate('PDFVisualEditor.exportProjectState()')
   selected=page.locator('.editor-object.selected').get_attribute('data-object-id')
   toggle=page.locator('#editorContextToggle');assert toggle.count()==1
   toggle.click();assert toggle.get_attribute('aria-expanded')=='false'
   assert page.locator('#editorTextValue').is_hidden()
   assert page.locator('#editorContextDone').is_visible()
   assert page.locator('.editor-object.selected').get_attribute('data-object-id')==selected
   assert page.evaluate('PDFVisualEditor.exportProjectState()')==original
   toggle.click();assert page.locator('#editorTextValue').input_value()=='Revisão: ação e coração'
   assert toggle.get_attribute('aria-expanded')=='true'
   for w,h in [(320,700),(360,740),(390,420),(768,390),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});page.locator('#editorTextValue').focus()
    page.wait_for_function('document.querySelector("#editorContextControls").getBoundingClientRect().bottom<=innerHeight+1')
    bounds=dock.bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=w+1,(engine,w,h,bounds)
    assert bounds['height']<=h*.55,(engine,w,h,bounds)
    page.wait_for_function('''()=>{const r=document.querySelector('.editor-object.selected').getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect(),dock=document.querySelector('#editorContextControls').getBoundingClientRect();return r.top>=Math.max(0,header.bottom)-1 && r.bottom<=dock.top+1}''')
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    assert page.locator('#editorContextDone').is_visible()
    toggle.click();toggle.click()
    assert page.locator('.editor-object.selected').get_attribute('data-object-id')==selected
   if engine=='chromium':
    # Real browser visual viewport / pinch zoom, not a mocked viewport getter.
    session=c.new_cdp_session(page);session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2})
    page.wait_for_function('visualViewport.scale===2')
    page.wait_for_function('document.querySelector("#editorContextControls").getBoundingClientRect().right<=visualViewport.offsetLeft+visualViewport.width+1')
    assert dock.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'Properties overflow at 200% visual zoom'
    assert page.locator('#editorContextDone').evaluate('e=>{const r=e.getBoundingClientRect();return r.right<=visualViewport.offsetLeft+visualViewport.width+1}')
    session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})
    page.wait_for_function('visualViewport.scale===1')
   # Selection changes reopen the panel; Done retains its original finish behavior.
   toggle.click();page.locator('#editorContextDone').click();assert page.locator('.editor-object.selected').count()==0
   page.locator('.editor-object').first.click();assert toggle.get_attribute('aria-expanded')=='true'
   exported=page.evaluate("""async()=>{const r=await PDFVisualEditor.exportPdf({silent:true}),t=pdfjsLib.getDocument({data:r.bytes});try{const d=await t.promise;return (await (await d.getPage(1)).getTextContent()).items.map(x=>x.str).join(' ')}finally{await t.destroy()}}""")
   assert 'ORIGINAL PRESERVADO' in exported and 'coração' in exported,exported
   # Common footer keeps invalid actions disabled and never duplicates the handler.
   for tool in page.evaluate('Object.keys(CentralPDFApp.getToolCatalog())'):
    page.evaluate('(t)=>CentralPDFApp.selectTool(t)',tool)
    page.evaluate("document.body.classList.add('settings-collapsed')")
    assert page.locator('#processButton').count()==1
    assert page.locator('#processButton').is_disabled()
    assert page.locator('#processButton').is_visible(),(engine,tool)
   assert not errors,errors
   print(engine,'editor collapse, resize, zoom and real PDF export passed',flush=True)
   c.close();b.close()
finally:s.shutdown()
print('mobile-refinement: import compaction, action order/reachability, selection-preserving collapse, resize and real export passed in Chromium/Firefox')
