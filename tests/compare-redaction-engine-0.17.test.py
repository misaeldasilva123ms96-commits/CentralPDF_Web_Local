import os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
compare=(root/'assets/js/compare-0.17.js').read_text(encoding='utf-8')
redact=(root/'assets/js/redaction-0.17.js').read_text(encoding='utf-8')
css=(root/'assets/css/professional-0.17.css').read_text(encoding='utf-8')
html=f'''<!doctype html><html><head><style>{css}</style></head><body data-active-tool="redact">
<div id="organizerSection"></div><button id="processButton"></button>
<div id="comparePlan"></div><select id="compareMode"><option value="hybrid" selected></option></select><input id="compareIgnoreCase" type="checkbox" checked><input id="compareIgnoreWhitespace" type="checkbox" checked><input id="compareThreshold" value="20"><input id="compareDpi" value="96"><input id="comparePages" value="all"><input id="compareIncludeImages" type="checkbox" checked>
<input id="redactionSearch"><select id="redactionSearchScope"><option value="all"></option></select><input id="redactionRegex" type="checkbox"><button id="redactionFind"></button><button id="redactionClearAll"></button><div id="redactionSummary"></div><select id="redactionDpi"><option value="150" selected></option></select><input id="redactionColor" value="#000000"><input id="redactionLabel"><input id="redactionRasterAll" type="checkbox"><input id="redactionReport" type="checkbox" checked>
<script>
function fakePage(n, variant){{return{{getViewport:({{scale}})=>({{width:300*scale,height:420*scale,transform:[scale,0,0,-scale,0,420*scale]}}),getTextContent:async()=>({{items:[{{str:n===2&&variant===2?'Valor alterado 200':'Valor original 100',width:120,height:12,transform:[1,0,0,1,40,380]}}]}}),render:({{canvasContext,viewport}})=>({{promise:new Promise(r=>{{canvasContext.fillStyle='#fff';canvasContext.fillRect(0,0,viewport.width,viewport.height);canvasContext.fillStyle=variant===2&&n===2?'#333':'#111';canvasContext.fillRect(30,30,60,40);r();}})}})}}}}
window.pdfjsLib={{Util:{{transform:(a,b)=>[1,0,0,1,b[4],420-b[5]]}},GlobalWorkerOptions:{{}},getDocument:({{data}})=>({{promise:Promise.resolve({{numPages:2,getPage:async n=>fakePage(n,data[0]),destroy:async()=>{{}}}})}})}};
class FakeZip{{constructor(){{this.files={{}}}}file(n,b){{this.files[n]=b;return this}}async generateAsync(o,cb){{cb?.({{percent:100}});return new Blob([JSON.stringify(Object.keys(this.files))],{{type:'application/zip'}})}}}}window.JSZip=FakeZip;
class FakeOut{{constructor(){{this.pages=[]}}async copyPages(s,ids){{return ids.map(i=>({{copied:i}}))}}addPage(p){{const x={{drawImage(){{}}}};this.pages.push(x);return x}}async embedJpg(){{return{{}}}}setTitle(){{}}setAuthor(){{}}setSubject(){{}}setKeywords(){{}}setCreator(){{}}setProducer(){{}}async save(){{return new Uint8Array([37,80,68,70,45,49])}}}}
window.PDFLib={{PDFDocument:{{load:async()=>({{getPageCount:()=>2,getPage:()=>({{getSize:()=>({{width:300,height:420}})}})}}),create:async()=>new FakeOut()}}}};
window.CentralPDFApp={{getFiles:()=>[]}};
{compare}
{redact}
</script></body></html>'''
with sync_playwright() as p:
 exe_override=None
 if os.name=='nt':
  mp=Path(os.environ.get('LOCALAPPDATA',''))/'ms-playwright'
  candidates=sorted(mp.glob('chromium-*/chrome-win*/chrome.exe')) if mp.is_dir() else []
  if candidates:
   exe_override=str(candidates[-1])
 b=p.chromium.launch(headless=True, executable_path=exe_override, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=b.new_page(viewport={'width':1200,'height':900}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 result=page.evaluate('''async()=>{const a=new File([new Uint8Array([1])],'original.pdf',{type:'application/pdf'}),b=new File([new Uint8Array([2])],'revisado.pdf',{type:'application/pdf'});const r=await CentralPDFCompare.process({files:[a,b],progress:()=>{},cancelled:()=>false});return {message:r.message,size:r.outputs[0].blob.size};}''')
 assert '1 de 2' in result['message'],result
 assert result['size']>20,result
 page.evaluate('''async()=>{const f=new File([new Uint8Array([1,2,3])],'sigiloso.pdf',{type:'application/pdf',lastModified:1});window.CentralPDFApp.getFiles=()=>[f];await CentralPDFRedaction.mount();await CentralPDFRedaction.updatePlan([f]);}''')
 page.wait_for_timeout(100)
 box=page.locator('#redactOverlay').bounding_box();assert box
 page.mouse.move(box['x']+40,box['y']+40);page.mouse.down();page.mouse.move(box['x']+150,box['y']+100);page.mouse.up()
 assert '1 área' in page.locator('#redactionSummary').inner_text()
 rr=page.evaluate('''async()=>{const f=window.CentralPDFApp.getFiles()[0];const r=await CentralPDFRedaction.process({files:[f],progress:()=>{},cancelled:()=>false});return {message:r.message,n:r.outputs.length,pdf:r.outputs[0].blob.size,report:await r.outputs[1].blob.text()};}''')
 assert '1 área' in rr['message'],rr
 assert rr['n']==2 and rr['pdf']>0,rr
 assert '"reconstructed": true' in rr['report'],rr
 assert not errors,errors
 print('compare-redaction-engine-0.17: passed')
 b.close()
