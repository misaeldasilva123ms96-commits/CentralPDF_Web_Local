from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import os
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'docs/testing/centralpdf-3/evidence'/os.environ.get('CAPTURE_PHASE','after');out.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(ROOT)));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch()
 for width,theme in [(1440,'dark'),(390,'light')]:
  c=b.new_context(viewport={'width':width,'height':1000 if width==1440 else 844});c.add_init_script(f"localStorage.setItem('centralpdf_theme_preference','{theme}')");c.route('https://**/*',lambda r:r.abort());page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_function('window.CentralPDFApp && document.querySelector("#cp101SettingsPanel")')
  page.screenshot(path=str(out/f'home-{width}-{theme}.png'),full_page=True)
  for tool in ['merge','split','organize','editPdf']:
   page.evaluate('(t)=>CentralPDFApp.selectTool(t)',tool)
   page.screenshot(path=str(out/f'{tool}-{width}-{theme}.png'))
  page.locator('#cp101SettingsButton').click();page.screenshot(path=str(out/f'settings-{width}-{theme}.png'));c.close()
 b.close()
s.shutdown()
