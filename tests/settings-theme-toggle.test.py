"""Real settings controls, preserved actions, keyboard and responsive layout."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from os import environ
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
actions={'layoutSettingsButton':'layoutSettingsDialog','cp15PresetsBtn':'cp15Presets','foundationProjectsButton':'foundationProjectsDialog','cp15ResultsBtn':'cp15Results','foundationQueueButton':'foundationQueueDialog','cp15FlowsBtn':'cp15Flows','foundationDiagnosticsButton':'foundationDiagnosticsDialog','cp10QualityButton':'cp10Quality'}
try:
    with sync_playwright() as p:
        for engine in ['chromium','firefox']:
            browser=getattr(p,engine).launch()
            for width,height in [(1440,1000),(390,844),(1366,640)]:
                context=browser.new_context(viewport={'width':width,'height':height})
                context.route('https://**/*',lambda route:route.abort())
                page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(origin);page.wait_for_selector('#cp101SettingsButton')
                assert 'Central PDF' in page.title()
                page.locator('#cp101SettingsButton').click()
                panel=page.locator('#cp101SettingsPanel');toggle=page.get_by_role('switch',name='Tema escuro')
                assert panel.is_visible() and toggle.count()==1
                assert panel.locator('.cp101-theme-option').count()==0
                assert panel.locator('.cp101-settings-action').count()==8
                for theme in ['dark','light']:
                    if page.locator('body').get_attribute('data-theme')!=theme:toggle.click()
                    assert page.locator('html').get_attribute('data-theme')==theme
                    assert toggle.get_attribute('aria-checked')==str(theme=='dark').lower()
                    assert panel.is_visible()
                    bounds=panel.bounding_box();assert bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=width+1 and bounds['y']+bounds['height']<=height+1,bounds
                    assert panel.evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
                    if environ.get('CENTRALPDF_QA_SCREENSHOTS') and height!=640:
                        out=Path(environ['CENTRALPDF_QA_SCREENSHOTS']);out.mkdir(parents=True,exist_ok=True)
                        panel.screenshot(path=str(out/f'settings-{engine}-{width}-{theme}.png'))
                        if width==1440:page.screenshot(path=str(out/f'pc-{engine}-{theme}.png'))
                toggle.focus();toggle.press('Space');assert toggle.get_attribute('aria-checked')=='true'
                toggle.press('Enter');assert toggle.get_attribute('aria-checked')=='false'
                toggle.press('Space');page.reload();page.wait_for_selector('#cp101SettingsButton')
                assert page.locator('body').get_attribute('data-theme')=='dark'
                page.locator('#cp101SettingsButton').click();page.keyboard.press('Escape')
                assert panel.is_hidden() and page.locator('#cp101SettingsButton').evaluate('(el)=>el===document.activeElement')
                page.locator('#cp101SettingsButton').click();page.mouse.click(2,height-2);assert panel.is_hidden()
                if width==1440:
                    page.evaluate("CentralPDFApp.selectTool('metadata')")
                    for button,dialog in actions.items():
                        page.locator('#cp101SettingsButton').click()
                        page.locator('#'+button).click()
                        page.locator('#'+dialog).wait_for(state='visible')
                        assert panel.is_hidden()
                        page.evaluate('(id)=>document.getElementById(id).close()',dialog)
                else:
                    page.locator('#cp101SettingsButton').click();page.locator('#cp101CloseSettings').click();assert panel.is_hidden()
                    page.locator('#cp101SettingsButton').click();page.locator('#cp10QualityButton').click()
                    page.locator('#cp10Quality').wait_for(state='visible');assert panel.is_hidden()
                    page.evaluate("document.getElementById('cp10Quality').close()")
                assert not errors,errors
                context.close()
            # Denying storage must not prevent opening settings or toggling.
            context=browser.new_context();context.add_init_script("Storage.prototype.setItem=function(){throw new Error('storage blocked')};Storage.prototype.getItem=function(){throw new Error('storage blocked')}")
            page=context.new_page();page.goto(origin);page.locator('#cp101SettingsButton').click();page.locator('#cp101ThemeToggle').click()
            assert page.locator('body').get_attribute('data-theme')=='dark'
            context.close();browser.close()
    print('settings-theme-toggle: Chromium/Firefox, themes, persistence, keyboard, 8 actions, mobile/short screens and blocked storage passed')
finally:
    server.shutdown()
