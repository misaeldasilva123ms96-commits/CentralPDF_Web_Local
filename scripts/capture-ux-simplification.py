from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json,sys,os,argparse,importlib.util
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Capture the real prepared app with synthetic PDF/image fixtures.')
parser.add_argument('--site',type=Path,required=True)
parser.add_argument('--phase',choices=['before','after'],required=True)
parser.add_argument('--output',type=Path)
args=parser.parse_args();SITE=args.site.resolve();phase=args.phase
OUT=args.output or ROOT/'docs/ux-simplification/evidence'/phase;OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('static_site',ROOT/'scripts/verify-static-site.py');validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
validation=validator.validate(SITE,require_engines=True)
if not validation['ok']:parser.error('Use a prepared copy: '+str(validation['errors']))

class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(SITE)));Thread(target=s.serve_forever,daemon=True).start()
setup='''async()=>{const d=await PDFLib.PDFDocument.create();for(let n=1;n<=3;n++){const p=d.addPage([420,595]);p.drawText('DOCUMENTO SINTETICO '+n,{x:30,y:535,size:18});p.drawRectangle({x:30,y:340,width:180,height:90,color:PDFLib.rgb(.3,.25,.8)});}const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#e4e0ff';x.fillRect(0,0,640,420);x.fillStyle='#6550db';x.fillRect(40,40,560,220);x.fillStyle='white';x.font='bold 40px sans-serif';x.fillText('Central PDF',70,160);window.qaPdf=new File([await d.save()],'Documento sintético.pdf',{type:'application/pdf'});window.qaImage=new File([await new Promise(r=>c.toBlob(r))],'Imagem sintética.png',{type:'image/png'});}'''
inventory={};issues=[]
with sync_playwright() as p:
 for browser_name in ['chromium','firefox']:
  b=getattr(p,browser_name).launch()
  for width,theme in [(1440,'dark'),(1440,'light'),(390,'dark'),(390,'light'),(320,'light'),(768,'dark')]:
   c=b.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');c.add_init_script("localStorage.setItem('centralpdf_theme_preference',"+json.dumps(theme)+");localStorage.setItem('centralpdf-usage-consent-v1','false')");c.route('https://**/*',lambda r:r.abort());page=c.new_page();page.set_default_timeout(30000);page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp');page.evaluate(setup)
   if browser_name=='chromium':page.screenshot(path=str(OUT/f'home-{width}-{theme}.png'))
   tools=page.evaluate('Object.keys(CentralPDFApp.getToolCatalog())')
   for tool in tools:
    page.evaluate('(t)=>CentralPDFApp.selectTool(t)',tool)
    if browser_name=='chromium' and width==1440 and theme=='dark':
     inventory[tool]=page.evaluate('''()=>({config:CentralPDFApp.getToolCatalog()[document.body.dataset.activeTool],controls:Array.from(document.querySelectorAll('#settingsContent input,#settingsContent select,#settingsContent textarea,#settingsContent button')).map(e=>({id:e.id,tag:e.tagName,type:e.type,value:e.value,label:document.querySelector('label[for="'+e.id+'"]')?.textContent||e.textContent,options:e.options?Array.from(e.options).map(o=>({value:o.value,label:o.textContent})):undefined})),details:Array.from(document.querySelectorAll('#settingsContent details')).map(e=>({id:e.id,title:e.querySelector('summary')?.textContent}))})''')
    if tool not in ['imagesToPdf','editPdf','merge','split','organize','compress','ocr','signPdf','watermark']:continue
    if True:page.evaluate('async t=>await CentralPDFApp.openFilesInTool(t==="imagesToPdf"?[qaImage]:t==="merge"?[qaPdf,new File([await qaPdf.arrayBuffer()],"Anexo.pdf",{type:"application/pdf"})]:[qaPdf],t)',tool)
    if tool=='editPdf':
     page.locator('#editorAddText').click();page.locator('#editorInteractionCanvas').click(position={'x':90,'y':150});page.locator('#editorContextControls').wait_for(state='visible');page.locator('#editorTextValue').fill('Texto de revisão')
    if browser_name=='chromium' or (tool in ['editPdf','imagesToPdf'] and width in [1440,390]):
     if tool!='editPdf':page.evaluate('scrollTo({top:0,behavior:"instant"})')
     page.screenshot(path=str(OUT/f'{tool}-{browser_name}-{width}-{theme}.png'))
     if tool=='imagesToPdf':
      page.evaluate('''async()=>{const a=[qaImage];for(let i=2;i<=3;i++){const c=document.createElement('canvas');c.width=480;c.height=640;const x=c.getContext('2d');x.fillStyle=i===2?'#2679db':'#199b79';x.fillRect(0,0,480,640);x.fillStyle='white';x.font='bold 44px sans-serif';x.fillText('Imagem '+i,50,160);a.push(new File([await new Promise(r=>c.toBlob(r))],'Imagem '+i+'.png',{type:'image/png'}));}await CentralPDFApp.addFiles(a.slice(1));}''')
      page.wait_for_function('document.querySelectorAll("#fileList img").length===3')
      page.evaluate('scrollTo({top:0,behavior:"instant"})')
      page.screenshot(path=str(OUT/f'images-multiple-{browser_name}-{width}-{theme}.png'))
    bad=page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    if bad:issues.append({'browser':browser_name,'width':width,'theme':theme,'tool':tool,'issue':'page horizontal overflow'})
   c.close()
  b.close()
s.shutdown()
(OUT/'capture-audit.json').write_text(json.dumps({'inventory':inventory,'issues':issues},ensure_ascii=False,indent=2))
print(phase,len(inventory),'tools',len(issues),'overflow findings')
