"""Real published app: compact text properties and image settings/export parity."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
from ux_browser_support import LocalEngineHandler as Handler

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  for engine in ['chromium','firefox']:
   browser=getattr(pw,engine).launch()
   context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True,reduced_motion='reduce')
   context.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false')")
   context.route('https://**/*',lambda r:r.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
   page.evaluate('''async()=>{const d=await PDFLib.PDFDocument.create();const p=d.addPage([420,595]);p.drawText('ORIGINAL PRESERVADO',{x:30,y:540,size:18});p.drawRectangle({x:30,y:300,width:120,height:70,color:PDFLib.rgb(.2,.3,.8)});window.uxPdf=new File([await d.save()],'Sintético.pdf',{type:'application/pdf'});await CentralPDFApp.openFilesInTool([uxPdf],'editPdf');}''')
   page.locator('#editorAddText').click();page.locator('#editorInteractionCanvas').click(position={'x':90,'y':150})
   dock=page.locator('#editorContextControls');dock.wait_for(state='visible')
   assert 340<=dock.bounding_box()['width']<=440,(engine,dock.bounding_box())
   assert page.locator('#editorTextOpacity').is_hidden(),'Secondary opacity belongs in More options'
   page.locator('#editorTextValue').fill('REVISADO COM ACENTO: ação');page.locator('#editorFontFamily').select_option('Courier');page.locator('#editorFontSize').fill('20');page.locator('#editorBold').check();page.locator('#editorItalic').check();page.locator('#editorTextAlign').select_option('center')
   page.locator('#editorObjectSizePanel summary').click();page.locator('#editorTextOpacity').fill('70');page.locator('#editorObjectX').fill('80');page.locator('#editorObjectX').dispatch_event('change')
   obj=page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects[0]');assert obj['opacity']==.7 and obj['text']=='REVISADO COM ACENTO: ação' and obj['bold'] and obj['italic'] and obj['fontFamily']=='Courier'
   page.locator('#editorObjectSizePanel summary').click();page.locator('#editorDuplicateObject').click();assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==2
   page.locator('#editorUndo').click();assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==1
   page.locator('#editorRedo').click();assert page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length')==2
   exported=page.evaluate('''async()=>{const r=await PDFVisualEditor.exportPdf({silent:true});const t=pdfjsLib.getDocument({data:r.bytes});try{const d=await t.promise;return (await (await d.getPage(1)).getTextContent()).items.map(x=>x.str).join(' ');}finally{await t.destroy();}}''');assert 'ORIGINAL PRESERVADO' in exported and 'REVISADO' in exported and 'ação' in exported,exported
   print(engine,'editor passed',flush=True)
   page.evaluate("""async()=>{
    window.uxImages=[];for(const [mime,w,h,color] of [['image/jpeg',120,80,'#d02030'],['image/png',80,120,'#20b050'],['image/webp',90,60,'#2040d0']]){
     const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(10,10,w-20,h-20);const blob=await new Promise(r=>c.toBlob(r,mime));uxImages.push(new File([blob],mime.split('/')[1]+'.'+mime.split('/')[1],{type:mime}));
    }await CentralPDFApp.openFilesInTool(uxImages,'imagesToPdf');window.uxOutputs=[];window.addEventListener('centralpdf-result',e=>uxOutputs.push(e.detail));HTMLAnchorElement.prototype.click=function(){};
   }""")
   page.wait_for_selector('.ux-image-paper')
   assert '3 imagens' in page.locator('#imageOutputSummary').inner_text()
   assert page.locator('#imageMergeAll').is_checked()
   page.locator('#imagePageMode').select_option('a4')
   page.locator('[data-setting="imageOrientation"][data-value="portrait"]').click()
   page.locator('[data-setting="imageMargin"][data-value="0"]').click()
   dimensions=[]
   for mode,orientation,margin in [('a4','portrait','0'),('a4','landscape','10'),('letter','portrait','20'),('letter','landscape','0'),('custom','portrait','10'),('custom','landscape','20'),('image','auto','0')]:
    page.locator('#imagePageMode').select_option(mode)
    page.locator('[data-setting="imageOrientation"][data-value="'+orientation+'"]').click()
    page.locator('[data-setting="imageMargin"][data-value="'+margin+'"]').click()
    if mode=='custom':page.locator('#imageCustomWidth').fill('150');page.locator('#imageCustomHeight').fill('220')
    expected=page.locator('.ux-image-paper').first.evaluate('p=>[+p.dataset.width,+p.dataset.height]')
    page.evaluate('uxOutputs.length=0')
    print(engine,mode,orientation,margin,'convert',flush=True)
    page.locator('#processButton').click();page.wait_for_function('uxOutputs.length>0')
    result=page.evaluate("""async()=>{const b=new Uint8Array(await uxOutputs[0].blob.arrayBuffer());const d=await PDFLib.PDFDocument.load(b);const t=pdfjsLib.getDocument({data:b});try{const pdf=await t.promise;await (await pdf.getPage(1)).getOperatorList();return d.getPages().map(p=>[p.getWidth(),p.getHeight()]);}finally{await t.destroy();}}""")
    assert len(result)==3
    assert all(abs(a-b)<.1 for a,b in zip(result[0],expected)),(engine,mode,orientation,result,expected)
    dimensions.append(result)
    page.locator('#continueEditingButton').click()
   assert dimensions[-1]==[[120,80],[80,120],[90,60]],dimensions[-1]
   # Ordering, per-image rotation, and output count keep the existing real pipeline.
   page.locator('.file-card').nth(0).locator('.move-down').click()
   assert page.evaluate('CentralPDFApp.getFiles()[0].type')=='image/png'
   page.locator('.file-card').nth(0).locator('.image-rotate-right').click()
   page.locator('#imageMergeAll').uncheck()
   assert '3 PDFs individuais em um ZIP' in page.locator('#imageOutputSummary').inner_text()
   page.evaluate('uxOutputs.length=0');page.locator('#processButton').click();page.wait_for_function('uxOutputs.length>0')
   parts=page.evaluate("""async()=>{const z=await JSZip.loadAsync(uxOutputs[0].blob);const out=[];for(const name of Object.keys(z.files)){const d=await PDFLib.PDFDocument.load(await z.file(name).async('uint8array'));out.push([name,d.getPages().map(p=>[p.getWidth(),p.getHeight()])]);}return out;}""")
   assert len(parts)==3 and parts[0][1]==[[120,80]],parts
   page.locator('#continueEditingButton').click()
   page.locator('.file-card').nth(2).locator('.file-card-remove').click()
   assert '2 imagens' in page.locator('#imageOutputSummary').inner_text()
   # Persisted settings use the original fields; the new checkbox must reflect restore.
   page.evaluate("""async()=>{const data=await CentralPDFApp.exportProjectState();const files=new Map(data.files.map(r=>[r.id,r.file]));await CentralPDFApp.importProjectState(data.snapshot,files);}""")
   assert not page.locator('#imageMergeAll').is_checked()
   assert not errors,errors
   context.close();browser.close()
finally:server.shutdown()
print('ux-simplification: compact text properties, advanced opacity, formatting, history and real PDF reopen passed in Chromium/Firefox')
