"""A real self-signed PDF must trigger a warning before a modifying operation."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def do_GET(self):
        if self.path.split('?')[0]=='/vendor/pdf-lib.min.js':
            data=(ROOT/'app/node_modules/pdf-lib/dist/pdf-lib.min.js').read_bytes()
        elif self.path.split('?')[0]=='/vendor/offline-status.js':
            data=b'window.CentralPDFOfflineStatus={pdfLib:true,pdfJs:false,pdfWorker:false};'
        else:return super().do_GET()
        self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers();self.wfile.write(data)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.PDFLib && window.CentralPDFToolQuality')
        result=page.evaluate('''async()=>{
          const bytes=await (await fetch('/tests/fixtures/signed-synthetic.pdf')).arrayBuffer();
          const file=new File([bytes],'Assinado sintético.pdf',{type:'application/pdf'});
          const before=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
          await CentralPDFApp.openFilesInTool([file],'metadata');
          const check=CentralPDFToolQuality.preflight('metadata');
          const after=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())));
          return {signature:CentralPDFApp.getFileSignatureInfo(file),warnings:check.issues,unchanged:JSON.stringify(before)===JSON.stringify(after)};
        }''')
        assert result['unchanged'] and result['signature']['digitalSignatures'],result
        assert any('assinatura' in x['message'].lower() and x['level']=='warn' for x in result['warnings']),result
        b.close();print('signature-warning: signed source detected, preflight warning, original hash unchanged')
finally:server.shutdown()
