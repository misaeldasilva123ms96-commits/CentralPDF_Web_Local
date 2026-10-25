"""Reload the prepared published application offline and export a real merged PDF."""
import argparse,json
from pathlib import Path
from functools import partial
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',type=Path,required=True);p.add_argument('--report',type=Path,required=True);args=p.parse_args()
class H(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(args.site.resolve())))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.wait_for_function('navigator.serviceWorker.controller')
        page.reload();page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
        context.set_offline(True)
        page.reload(wait_until='domcontentloaded');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
        result=page.evaluate('''async()=>{
          const files=[];
          for(const n of [3,2]){const d=await PDFLib.PDFDocument.create();for(let i=0;i<n;i++)d.addPage().drawText('OFFLINE TEST '+n);files.push(new File([await d.save()],'Offline '+n+'.pdf',{type:'application/pdf'}));}
          let output;addEventListener('centralpdf-result',e=>output=e.detail.blob,{once:true});HTMLAnchorElement.prototype.click=function(){};
          await CentralPDFApp.openFilesInTool(files,'merge');const run=await CentralPDFApp.processCurrentTool();
          if(!run.ok)throw run.error;
          const data=new Uint8Array(await output.arrayBuffer());const pdf=await PDFLib.PDFDocument.load(data);
          const task=pdfjsLib.getDocument({data:data.slice()});const rendered=await task.promise;
          const text=(await (await rendered.getPage(1)).getTextContent()).items.map(x=>x.str).join(' ');await task.destroy();
          return {pages:pdf.getPageCount(),text,bytes:data.length,telemetry:CentralPDFTelemetry.getStatus(),offlineStatus:CentralPDFOfflineStatus};
        }''')
        assert result['pages']==5 and 'OFFLINE TEST' in result['text'],result
        assert result['offlineStatus']['prepared'] and result['telemetry']['sent']==0,result
        assert not errors,errors
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,indent=2))
        browser.close();print('Offline prepared app: reload, real PDF.js Worker, merge and exported five pages passed')
finally:server.shutdown()
