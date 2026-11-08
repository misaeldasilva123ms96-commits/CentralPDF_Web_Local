"""Reproducible screenshots of the real prepared application, synthetic files only."""
import argparse,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--browsers',nargs='+',choices=['chromium','firefox'],default=['chromium','firefox']);args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(args.site.resolve())));Thread(target=s.serve_forever,daemon=True).start()
records=[];errors=[];console=[]
try:
 with sync_playwright() as p:
  for engine in args.browsers:
   b=getattr(p,engine).launch()
   for width,theme in [(1440,'dark'),(1440,'light'),(390,'dark'),(390,'light')]:
    c=b.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');c.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false');localStorage.setItem('centralpdf_theme_preference',"+json.dumps(theme)+")")
    c.route('https://**/*',lambda r:r.abort());page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append({'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
    page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.PDFLib && window.CentralPDFApp && window.pdfjsLib');assert 'Central PDF' in page.title();assert page.locator('vite-error-overlay,nextjs-portal').count()==0
    page.evaluate("""async()=>{const d=await PDFLib.PDFDocument.create();for(let i=1;i<=3;i++){const p=d.addPage([420,595]);p.drawText('DOCUMENTO SINTETICO '+i,{x:30,y:535,size:18});p.drawRectangle({x:30,y:340,width:180,height:90,color:PDFLib.rgb(.3,.25,.8)});}window.capturePdf=new File([await d.save()],'Documento sintético.pdf',{type:'application/pdf'});const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#e4e0ff';x.fillRect(0,0,640,420);x.fillStyle='#6550db';x.fillRect(40,40,560,220);x.fillStyle='white';x.font='bold 40px sans-serif';x.fillText('Central PDF',70,160);window.captureImage=new File([await new Promise(r=>c.toBlob(r))],'Imagem sintética.png',{type:'image/png'});} """)
    def capture(name):
     page.evaluate('()=>document.fonts.ready');page.wait_for_function('document.querySelectorAll(".file-card-cover.loading").length===0');page.evaluate('()=>new Promise(requestAnimationFrame)');file=f'{name}-{engine}-{width}-{theme}.png';page.screenshot(path=str(args.output/file));records.append({'file':file,'tool':page.evaluate('CentralPDFApp.getActiveTool()'),'width':width,'theme':theme,'browser':engine})
    capture('home')
    page.evaluate("CentralPDFApp.selectTool('imagesToPdf')");page.evaluate('scrollTo(0,0)');capture('images-empty')
    for tool in ['imagesToPdf','editPdf','merge','split','organize','compress']:
     page.evaluate("async t=>{await CentralPDFApp.openFilesInTool(t==='imagesToPdf'?[captureImage]:t==='merge'?[capturePdf,new File([await capturePdf.arrayBuffer()],'Anexo.pdf',{type:'application/pdf'})]:[capturePdf],t)}",tool)
     if tool=='imagesToPdf':page.wait_for_selector('.ux-image-paper')
     if tool=='editPdf':
      page.locator('#editorAddText').click();page.locator('#editorInteractionCanvas').click(position={'x':90,'y':150});page.locator('#editorTextValue').fill('Texto de revisão: ação');capture('editor-expanded')
      if width==390 and page.locator('#editorContextToggle').count():
       before=page.evaluate('PDFVisualEditor.exportProjectState()');page.locator('#editorContextToggle').click();assert page.evaluate('PDFVisualEditor.exportProjectState()')==before;capture('editor-collapsed')
     else:page.evaluate('scrollTo(0,0)');capture(tool)
    c.close();print(engine,width,theme,'captured',flush=True)
   b.close()
finally:s.shutdown()
(args.output/'manifest.json').write_text(json.dumps({'records':records,'pageErrors':errors,'console':console},ensure_ascii=False,indent=2))
assert not errors,errors
print(len(records),'screenshots; no page errors')
