"""Real permission-encrypted PDFs: no opening password, native processing, real password guard.

Only the synthetic corpus is committed. --files accepts local private reproductions;
the documents are never uploaded or included in the report.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import argparse, hashlib, json, re, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--files',nargs=2,type=Path);parser.add_argument('--report',type=Path);args=parser.parse_args()
files=args.files or [root/'tests/pdf-corpus/fixtures/open-access-owner-aes128.pdf',root/'tests/pdf-corpus/fixtures/open-access-owner-aes256.pdf']
hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
html=(root/'index.html').read_text();html=re.sub(r'<script src="[^"]+"></script>','',html);html=re.sub(r'<link[^>]+rel="manifest"[^>]*>','',html)
scripts=['app/node_modules/pdf-lib/dist/pdf-lib.min.js','vendor/jszip.min.js','assets/js/pdf-ingest.js','assets/js/pdf-open-access.js','assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/pdf-native-text.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/intelligence-0.20.js','assets/js/layout-controls.js']
html=html.replace('</body>',''.join(f'<script src="/{s}"></script>' for s in scripts)+'''<script type="module">
import * as pdfjs from '/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs';window.pdfjsLib=pdfjs;pdfjs.GlobalWorkerOptions.workerSrc='/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';window.testReady=true;</script></body>''')
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/assets/js/pdf-open-access-worker.js':
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'none'");self.end_headers();self.wfile.write((root/'assets/js/pdf-open-access-worker.js').read_bytes())
  elif self.path=='/test':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())
  else:super().do_GET()
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(root)));Thread(target=s.serve_forever,daemon=True).start();results=[]
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   b=getattr(p,engine).launch();c=b.new_context(accept_downloads=True);c.route('https://**/*',lambda r:r.abort());page=c.new_page();errors=[];writes=[];page.on('pageerror',lambda e:errors.append(str(e)));c.on('request',lambda r:writes.append(r.method) if r.method!='GET' else None)
   page.goto(f'http://127.0.0.1:{s.server_port}/test');page.wait_for_function('window.testReady && window.CentralPDFApp')
   assert not page.evaluate('crossOriginIsolated'),'Must work on normal GitHub Pages without shared-memory headers'
   original=[list(f.read_bytes()) for f in files]
   # An independent renderer opens the originals with no password, before any conversion.
   page.evaluate('''async list=>{
    window.qaSources=list;
    window.qaRender=async data=>{const task=pdfjsLib.getDocument({data:new Uint8Array(data)});try{const doc=await task.promise;const values=[];for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n),v=p.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport:v}).promise;const text=(await p.getTextContent()).items.map(x=>x.str).join(' ');const digest=await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,canvas.width,canvas.height).data);values.push({size:[v.width,v.height],text,pixels:[...new Uint8Array(digest)]});}return values;}finally{await task.destroy();}};
    window.qaExpected=(await Promise.all(list.map(qaRender))).flat();
   }''',original)
   page.evaluate("CentralPDFApp.selectTool('merge')");page.locator('#fileInput').set_input_files([str(f) for f in files]);page.wait_for_function('CentralPDFApp.getFiles().length===2',timeout=60000)
   accepted=page.evaluate('''async()=>{const out=[];for(const f of CentralPDFApp.getFiles()){const d=await PDFLib.PDFDocument.load(await f.arrayBuffer());out.push({name:f.name,pages:d.getPageCount()});}return out;}''')
   assert [x['name'] for x in accepted]==[f.name for f in files],accepted
   page.locator('#outputFileName').fill('Notas sem senha')
   with page.expect_download() as d:page.locator('#processButton').click()
   assert d.value.suggested_filename=='Notas sem senha.pdf'
   merged=list(Path(d.value.path()).read_bytes());same=page.evaluate('async bytes=>JSON.stringify(await qaRender(bytes))===JSON.stringify(qaExpected)',merged);assert same,(engine,'text, geometry or pixels changed')
   page.locator('#continueEditingButton').click()
   # A genuine opening password is still rejected; no guessing or ignoreEncryption.
   protected=root/'tests/pdf-corpus/fixtures/open-access-password.pdf';page.locator('#fileInput').set_input_files(str(protected));page.wait_for_function("document.querySelector('#statusBox').innerText.includes('protegido por senha')",timeout=60000);assert page.evaluate('CentralPDFApp.getFiles().length')==2
   page.locator('#fileInput').set_input_files(str(root/'tests/pdf-corpus/fixtures/open-access-plain.pdf'));page.wait_for_function('CentralPDFApp.getFiles().length===3')
   # Exercise the PDF.js ingestion path, too, and preserve originals for diagnostics.
   for tool in ['editPdf','split','organize','pdfToImage','diagnose']:
    source=original[0];name=files[0].name
    awaitable=page.evaluate('''async ({tool,data,name})=>{await CentralPDFApp.openFilesInTool([new File([new Uint8Array(data)],name,{type:'application/pdf',lastModified:123456})],tool);return CentralPDFApp.getFiles().length;}''',{'tool':tool,'data':source,'name':name})
    assert awaitable==1,(engine,tool,page.locator('#statusBox').inner_text())
    if tool=='diagnose':assert page.evaluate('async()=>[...new Uint8Array(await CentralPDFApp.getFiles()[0].arrayBuffer())]',)==source
    else:assert page.evaluate('async()=>!(await PDFLib.PDFDocument.load(await CentralPDFApp.getFiles()[0].arrayBuffer())).isEncrypted')
   # Rename is read-only: export the exact original bytes, including encryption/signatures.
   page.evaluate("CentralPDFApp.selectTool('classifyRename')")
   page.locator('#fileInput').set_input_files([str(f) for f in files])
   page.wait_for_function('CentralPDFApp.getFiles().length===2',timeout=60000)
   assert page.evaluate('async()=>Promise.all(CentralPDFApp.getFiles().map(async f=>[...new Uint8Array(await f.arrayBuffer())]))')==original
   page.locator('#renameTemplate').fill('{original}_renomeado')
   try:
    with page.expect_download() as renamed:page.locator('#processButton').click()
   except Exception as error:
    raise AssertionError((engine, 'rename export', page.locator('#statusBox').inner_text(), errors)) from error
   with zipfile.ZipFile(renamed.value.path()) as archive:
    report=json.loads(archive.read('classificacao_renomeacao.json'))
    assert len(report['documents'])==2
    for source,doc in zip(files,report['documents']):
     assert doc['pageCount']>0
     assert archive.read('arquivos_renomeados/'+doc['suggestedName'])==source.read_bytes(),(engine,'rename changed original PDF bytes')
   page.locator('#continueEditingButton').click()
   awaitable=page.evaluate("async()=>{await CentralPDFApp.openFilesInTool([new File([new Uint8Array(qaSources[0])],'Acesso livre.pdf',{type:'application/pdf'})],'unlock');return CentralPDFApp.getFiles().length;}")
   assert awaitable==1
   assert page.locator('#unlockPassword').input_value()==''
   with page.expect_download() as unlocked:page.locator('#processButton').click()
   assert page.evaluate('async b=>(await PDFLib.PDFDocument.load(new Uint8Array(b))).getPageCount()',list(Path(unlocked.value.path()).read_bytes()))==accepted[0]['pages']
   assert not writes,(engine,'document/network writes',writes);assert not errors,errors
   results.append({'browser':engine,'accepted':len(accepted),'native_merge_text_geometry_pixels':'identical','real_password':'still required','additional_tools':5,'rename_zip_original_bytes':'identical','originals':'unchanged','network_writes':0});c.close();b.close()
finally:s.shutdown()
for f in files:assert hashlib.sha256(f.read_bytes()).hexdigest()==hashes[str(f)]
if args.report:args.report.write_text(json.dumps(results,indent=2))
print('pdf-open-access: empty opening passwords, native merge, unchanged text/pixels, true password guard and tool paths passed',results)
