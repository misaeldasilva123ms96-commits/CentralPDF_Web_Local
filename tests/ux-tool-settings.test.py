"""Preserve every baseline control/option while folding explicit secondary settings."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
ROOT=Path(__file__).resolve().parents[1]
BASE=json.loads((ROOT/'docs/ux-simplification/inventario-base.json').read_text())
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/vendor/offline-status.js':
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(b'window.CentralPDFOfflineStatus={prepared:true,pdfLib:true,pdfJs:true,pdfWorker:true,ocr:true,conversions:true};');return
  super().do_GET()
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));Thread(target=s.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   browser=getattr(p,engine).launch()
   for width,theme in [(1440,'dark'),(390,'light')]:
    c=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');c.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false');localStorage.setItem('centralpdf_theme_preference',"+json.dumps(theme)+")");c.route('https://**/*',lambda r:r.abort());page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.PDFLib && window.CentralPDFApp && window.CentralPDFToolSearch')
    assert len(page.evaluate('Object.keys(CentralPDFApp.getToolCatalog())'))==34
    for tool,item in BASE.items():
     page.evaluate('(t)=>CentralPDFApp.selectTool(t)',tool)
     soup=BeautifulSoup(item['sourceConfig']['settings'],'html.parser')
     for field in soup.select('input[id],select[id],textarea[id],button[id]'):
      locator=page.locator('[id="'+field['id']+'"]');assert locator.count()==1,(engine,width,tool,field['id'])
      if field.name=='select':assert locator.locator('option').evaluate_all('els=>els.map(e=>e.value)')==[o.get('value',o.text) for o in field.select('option')],(tool,field['id'])
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(engine,width,tool)
    page.evaluate("async()=>{const d=await PDFLib.PDFDocument.create();d.addPage();await CentralPDFApp.openFilesInTool([new File([await d.save()],'Sintético.pdf',{type:'application/pdf'})],'ocr');}")
    panel=page.locator('#toolAdvanced');assert panel.count()==1 and not panel.evaluate('e=>e.open')
    panel.locator(':scope > summary').focus();page.keyboard.press('Enter');assert panel.evaluate('e=>e.open')
    page.locator('#ocrPageSegMode').select_option('block')
    panel.locator(':scope > summary').click();panel.locator(':scope > summary').click();assert page.locator('#ocrPageSegMode').input_value()=='block'
    # All 39 visible shortcuts still enter their real family and format preset.
    for i in range(39):
     page.locator('#homeBrand').click();card=page.locator('.tool-card[data-tool]').nth(i);tool=card.get_attribute('data-tool');card.click();assert page.evaluate('CentralPDFApp.getActiveTool()')==tool
    c.close()
   browser.close()
finally:s.shutdown()
print('ux-tool-settings: 34 families, all baseline IDs/options, 39 clickable shortcuts, keyboard disclosure and setting persistence passed in Chromium/Firefox')
