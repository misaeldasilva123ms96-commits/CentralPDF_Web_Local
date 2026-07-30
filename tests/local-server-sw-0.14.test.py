from playwright.sync_api import sync_playwright, Error as PlaywrightError
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import functools

root = Path(__file__).resolve().parents[1]
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f'http://127.0.0.1:{server.server_address[1]}/index.html'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        context = browser.new_context()
        page = context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('https://**/*', lambda route: route.abort())
        try:
            page.goto(url, wait_until='domcontentloaded')
        except PlaywrightError as error:
            if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(error):
                print('local-server-sw-0.14: skipped (Chromium policy blocks localhost in this environment)')
                browser.close()
                raise SystemExit(0)
            raise
        page.wait_for_selector('#cp101SettingsButton')
        page.evaluate("navigator.serviceWorker.ready")
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('#cp101SettingsButton')
        page.wait_for_function("navigator.serviceWorker.controller !== null")
        page.locator('#cp101SettingsButton').click()
        page.wait_for_selector('#foundationDiagnosticsButton', state='visible')
        page.locator('#foundationDiagnosticsButton').click()
        page.wait_for_function("document.querySelector('#foundationDiagnosticsDialog').open === true")
        text=page.locator('#foundationDiagnosticsContent').inner_text()
        assert 'Servidor local seguro' in text
        assert 'Ativo' in text
        assert not errors, errors
        print('local-server-sw-0.14: passed')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
