"""Exact synthetic acceptance exports for the three 3.0 reference workspaces."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import re

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', '', html)
scripts = ['app/node_modules/pdf-lib/dist/pdf-lib.min.js','vendor/jszip.min.js',
           'assets/js/pdf-ingest.js',
           'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
           'assets/js/pdf-native-text.js', 'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
           'assets/js/ux-enhancements.js', 'assets/js/app.js',
           'assets/js/layout-controls.js', 'assets/js/foundation.js', 'assets/js/experience-0.15.js',
           'assets/js/stable-1.0.js', 'assets/js/header-settings-1.0.3.js',
           'assets/js/product-redesign-2.0.js']
html = html.replace('</body>', ''.join(f'<script src="/{name}"></script>' for name in scripts) + '''
<script type="module">
  import * as pdfjs from '/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
  window.pdfjsLib = pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = '/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
  window.testReady = true;
</script></body>''')


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
import json,hashlib,zipfile,io
out=Path(os.environ.get('CENTRALPDF_DESIGN_EVIDENCE','/tmp/centralpdf-design-exports'));out.mkdir(parents=True,exist_ok=True)
records=[]
READ="""async bytes=>{const task=pdfjsLib.getDocument({data:Uint8Array.from(bytes)}),d=await task.promise;try{const pages=[];for(let n=1;n<=d.numPages;n++){const p=await d.getPage(n);pages.push({text:(await p.getTextContent()).items.map(i=>i.str).join(' '),rotation:p.rotate});}return pages;}finally{await task.destroy();}}"""
try:
 with sync_playwright() as p:
  b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000});page.route('https://**/*',lambda r:r.abort());page.goto(f'http://127.0.0.1:{server.server_port}/test');page.wait_for_function('window.testReady')
  page.evaluate("""async()=>{window.fixtures={};for(const [name,prefix,count] of [['a','A',2],['b','B',3],['six','P',6],['four','P',4]]){const d=await PDFLib.PDFDocument.create();for(let i=1;i<=count;i++)d.addPage([420,595]).drawText(prefix+i,{x:30,y:500});fixtures[name]=new File([await d.save()],name+'.pdf',{type:'application/pdf'});}}""")
  def export(label):
   page.screenshot(path=str(out/(label+'.png')))
   with page.expect_download() as e:page.locator('#processButton').click()
   data=Path(e.value.path()).read_bytes();records.append({'case':label,'filename':e.value.suggested_filename,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
   return data
  def resume():
   page.locator('#continueEditingButton').click();page.locator('#completionActions').wait_for(state='hidden')
  page.evaluate("CentralPDFApp.openFilesInTool([fixtures.a,fixtures.b],'merge')")
  assert page.locator('#mergePageView').input_value()=='covers'
  page.locator('#pageGrid .page-card').nth(1).locator('.move-left').click()
  rows=page.evaluate(READ,list(export('merge-cover-reordered')));assert [r['text'] for r in rows]==['B1','B2','B3','A1','A2'],rows;records[-1]['pages']=rows;resume()
  page.evaluate("CentralPDFApp.openFilesInTool([fixtures.six],'split')")
  page.evaluate("CentralPDFApp.applySettings({splitMode:'custom',splitCustomGroups:'1-2;3-4;5-6'})")
  data=export('split-three-ranges');parts=[]
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   for name in z.namelist():
    if name.endswith('.pdf'):parts.append([r['text'] for r in page.evaluate(READ,list(z.read(name)))])
  assert parts==[['P1','P2'],['P3','P4'],['P5','P6']],parts;records[-1]['parts']=parts;resume()
  page.evaluate("CentralPDFApp.openFilesInTool([fixtures.four],'organize')")
  for i in [3,2,1]:page.locator('#pageGrid .page-card').nth(i).locator('.move-left').click()
  page.locator('#pageGrid .page-card').nth(2).locator('.right').click()
  page.locator('#pageGrid .page-card').nth(1).locator('.duplicate').click()
  page.locator('#pageGrid .page-card').nth(4).locator('.delete').click()
  page.locator('#organizerAddBlank').click();page.locator('#organizerInsertMode').select_option('end');page.locator('#confirmOrganizerAdd').click()
  page.wait_for_function("document.querySelectorAll('#pageGrid .page-card').length===5")
  assert page.locator('#pageGrid .page-card').count()==5
  rows=page.evaluate(READ,list(export('organize-edit-sequence')))
  assert [r['text'] for r in rows]==['P4','P1','P1','P2',''],rows
  assert rows[3]['rotation']==90,rows;records[-1]['pages']=rows
  b.close()
finally:server.shutdown()
(out/'reference-exports.json').write_text(json.dumps(records,indent=2))
print('redesign-3-exports: exact merge order, split contents, organization and hashes passed')
