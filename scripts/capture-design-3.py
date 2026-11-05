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
  page.locator('#cp101SettingsButton').click();page.screenshot(path=str(out/f'settings-{width}-{theme}.png'))
  actions={'layoutSettingsButton':'layoutSettingsDialog','cp15PresetsBtn':'cp15Presets','foundationProjectsButton':'foundationProjectsDialog','cp15ResultsBtn':'cp15Results','foundationQueueButton':'foundationQueueDialog','cp15FlowsBtn':'cp15Flows','foundationDiagnosticsButton':'foundationDiagnosticsDialog','cp10QualityButton':'cp10Quality'}
  for button,dialog in actions.items():
   if page.locator('#cp101SettingsPanel').is_hidden():page.locator('#cp101SettingsButton').click()
   page.locator('#'+button).click();page.locator('#'+dialog).wait_for(state='visible')
   bounds=page.locator('#'+dialog).bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=width+1,(dialog,width,bounds)
   assert page.locator('#'+dialog).evaluate('el=>el.scrollWidth<=el.clientWidth+1'),(dialog,width,'horizontal overflow')
   page.locator('#'+dialog).screenshot(path=str(out/f'{dialog}-{width}-{theme}.png'))
   page.evaluate('(id)=>document.getElementById(id).close()',dialog)
  page.locator('#helpButton').click();page.locator('dialog[open]').screenshot(path=str(out/f'help-{width}-{theme}.png'));page.evaluate('document.querySelector("dialog[open]").close()')
  c.close()
 b.close()
s.shutdown()
