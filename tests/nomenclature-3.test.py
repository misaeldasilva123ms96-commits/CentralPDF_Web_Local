"""Visible naming and backwards search compatibility, with real JPG/PNG/WEBP exports."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
from PIL import Image
import argparse, json

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--evidence', type=Path)
args = parser.parse_args()
brand = 'Central PDF & Imagem' if args.baseline else 'Central PDF'
label = 'Imagens para PDF' if args.baseline else 'JPG/PNG para PDF'
heading = label + ' avançado' if args.baseline else label
html = (ROOT/'index.html').read_text().replace('<script src="assets/js/engine-loader.js"></script>', '<script src="app/node_modules/pdf-lib/dist/pdf-lib.min.js"></script>')
html = html.replace('</body>', '''<script type="module">import * as pdfjs from '/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs';window.qaPdfJs=pdfjs;pdfjs.GlobalWorkerOptions.workerSrc='/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';</script></body>''')
class Handler(SimpleHTTPRequestHandler):
 def log_message(self, *args): pass
 def do_GET(self):
  if self.path == '/':
   self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers(); self.wfile.write(html.encode())
  else: super().do_GET()
server = ThreadingHTTPServer(('127.0.0.1',0), partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
results = []
try:
 with TemporaryDirectory() as tmp, sync_playwright() as p:
  files = []
  for extension, kind, color in [('jpg','JPEG',(200,30,40)),('png','PNG',(30,180,70)),('webp','WEBP',(30,60,200))]:
   path = Path(tmp)/f'Imagem sintética.{extension}'
   Image.new('RGB',(96,64),color).save(path,format=kind)
   files.append(str(path))
  for engine,width,theme in [('chromium',1440,'dark'),('chromium',390,'light'),('firefox',1440,'light'),('firefox',390,'dark')]:
   browser = getattr(p,engine).launch()
   context = browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce',accept_downloads=True,service_workers='block')
   context.add_init_script(f"localStorage.setItem('centralpdf_theme_preference','{theme}')")
   context.route('https://**/*',lambda route:route.abort())
   page = context.new_page(); errors = []
   page.on('pageerror',lambda error:errors.append(str(error)))
   page.goto(f'http://127.0.0.1:{server.server_port}/')
   page.wait_for_function('window.CentralPDFApp && window.qaPdfJs && window.CentralPDFToolSearch && window.CentralPDFStable')
   assert page.title() == brand
   assert page.locator('footer').first.locator('span').first.inner_text() == f'{brand} — Web Local 3.0.0'
   catalog = page.evaluate('CentralPDFApp.getToolCatalog()'); assert len(catalog)==34
   assert page.locator('.tool-card[data-tool]').count()==39
   assert all(x['handler'] for x in page.evaluate('CentralPDFApp.getToolCapabilities()').values())
   card = page.locator('.tool-card[data-tool="imagesToPdf"]')
   assert card.locator('strong').inner_text()==label
   accept = catalog['imagesToPdf']['accept']
   assert accept=='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
   if args.evidence and engine=='chromium':
    args.evidence.mkdir(parents=True,exist_ok=True)
    card.screenshot(path=str(args.evidence/f'card-{width}-{theme}.png'))
    page.locator('footer').first.screenshot(path=str(args.evidence/f'footer-{width}-{theme}.png'))
   for query in ['JPG/PNG para PDF','Imagens para PDF','WEBP para PDF']:
    page.locator('#toolSearch').fill(query); assert card.is_visible(),(engine,query)
   page.locator('#toolSearch').fill('')
   page.locator('#converterMenuButton').click()
   assert page.locator('#converterMenu button').filter(has_text=label).count()==1
   page.keyboard.press('Escape')
   card.click(); assert page.evaluate('CentralPDFApp.getActiveTool()')=='imagesToPdf'
   assert page.locator('#operationTitle').inner_text()==heading
   page.locator('#fileInput').set_input_files(files)
   page.wait_for_function('CentralPDFApp.getFiles().length===3')
   page.locator('#fileReadProgress').wait_for(state='hidden')
   page.locator('#imageMargin').fill('0')
   if args.evidence and engine=='chromium': page.screenshot(path=str(args.evidence/f'workspace-{width}-{theme}.png'))
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   with page.expect_download() as download: page.locator('#processButton').click()
   pixels = page.evaluate('''async bytes=>{const task=qaPdfJs.getDocument({data:new Uint8Array(bytes)});try{const doc=await task.promise;const out=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),v=page.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=v.width;canvas.height=v.height;const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport:v}).promise;out.push({width:v.width,height:v.height,pixel:[...ctx.getImageData(48,32,1,1).data]});}return out;}finally{await task.destroy();}}''',list(Path(download.value.path()).read_bytes()))
   assert len(pixels)==3
   for rendered,expected in zip(pixels,[(200,30,40),(30,180,70),(30,60,200)]):
    assert rendered['width']==96 and rendered['height']==64
    assert all(abs(a-b)<=5 for a,b in zip(rendered['pixel'][:3],expected)),rendered
   assert not errors,errors
   results.append({'browser':engine,'width':width,'theme':theme,'title':page.title(),'tool':heading,'modules':34,'shortcuts':39,'accept':accept,'rendered':pixels})
   context.close(); browser.close()
finally: server.shutdown()
if args.evidence: (args.evidence/'report.json').write_text(json.dumps(results,indent=2))
print('nomenclature-3: naming, old/new search, navigation and native JPG/PNG/WEBP conversion passed',results)
