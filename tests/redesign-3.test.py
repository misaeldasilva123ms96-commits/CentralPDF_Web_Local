"""3.0 real DOM: 34 workspaces/39 shortcuts, themes, menus, mobile and focus."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(ROOT)));Thread(target=s.serve_forever,daemon=True).start()
results=[]
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   b=getattr(p,engine).launch()
   for width in [320,360,390,768,1024,1440]:
    c=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');c.route('https://**/*',lambda r:r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{s.server_port}/');page.wait_for_selector('#cp101ThemeToggle');assert page.locator('.tool-card').count()==39
    for theme in ['light','dark']:
     if page.locator('body').get_attribute('data-theme')!=theme:page.locator('#cp101ThemeToggle').click()
     assert page.locator('#homeBrand strong').inner_text()=='Central PDF'
     assert page.locator('#helpButton').is_visible()
     assert page.locator('#cp101SettingsPanel #cp101ThemeToggle').count()==0
     for tool in page.evaluate('Object.keys(CentralPDFApp.getToolCatalog())'):
      assert page.evaluate('(t)=>CentralPDFApp.selectTool(t)',tool)
      metrics=page.locator('#operationTitle').evaluate("el=>({gradient:getComputedStyle(el).backgroundImage,w:el.getBoundingClientRect().width,container:el.parentElement.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth+1})")
      assert 'linear-gradient' in metrics['gradient'],(engine,width,theme,tool,metrics)
      assert not metrics['overflow'],(engine,width,theme,tool,metrics)
     page.locator('#cp101SettingsButton').click();assert page.locator('#cp101SettingsPanel .cp101-settings-action').count()==8
     page.keyboard.press('Escape');assert page.locator('#cp101SettingsPanel').is_hidden()
     assert page.locator('#cp101SettingsButton').evaluate('e=>e===document.activeElement')
     page.locator('#converterMenuButton').click();page.locator('#converterMenu').wait_for(state='visible')
     assert page.locator('#converterMenu button').count()==16
     assert page.locator('#converterMenu h2').inner_text()=='Converter PDF e arquivos'
     panel=page.locator('#converterMenu').bounding_box()
     assert panel['x']>=0 and panel['x']+panel['width']<=width+1,(width,panel)
     page.keyboard.press('Escape');assert page.locator('#converterMenu').is_hidden()
     page.locator('#allToolsMenuButton').scroll_into_view_if_needed();page.locator('#allToolsMenuButton').click();assert page.locator('#allToolsMegaMenu button[data-mega-tool]').count()==39
     panel=page.locator('#allToolsMegaMenu').bounding_box()
     assert panel['width']<=820 and panel['x']>=0 and panel['x']+panel['width']<=width+1,(engine,width,panel)
     columns=page.locator('#allToolsMegaMenu').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')
     assert columns==(2 if width<=680 else 4),(width,columns)
     page.keyboard.press('Escape')
     page.locator('#allToolsMenuButton').focus();page.keyboard.press('Enter')
     panel=page.locator('#allToolsMegaMenu').bounding_box()
     assert panel['x']>=0 and panel['x']+panel['width']<=width+1,(width,'keyboard menu',panel)
     assert page.locator('#allToolsMegaMenu').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
     page.locator('#allToolsMegaMenu button[data-mega-tool]').first.focus();page.keyboard.press('Escape')
     page.wait_for_function('document.activeElement.id==="allToolsMenuButton"')
     page.locator('#homeBrand').click()
     assert page.locator('.hero-copy h1').bounding_box()['width']<=760
     assert 'linear-gradient' in page.locator('#homeImportButton').evaluate('e=>getComputedStyle(e).backgroundImage')
    assert not errors,errors
    results.append({'browser':engine,'width':width,'themes':2,'workspaces':34,'shortcuts':39})
    c.close()
   b.close()
finally:s.shutdown()
if os.environ.get('CENTRALPDF_DESIGN_REPORT'):Path(os.environ['CENTRALPDF_DESIGN_REPORT']).write_text(json.dumps(results,indent=2))
print('redesign-3: 34 workspaces, 39 shortcuts, 6 widths, both themes and browsers passed')
