from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import functools

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}/index.html'

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        remote_requests = []

        def block_remote(route):
            remote_requests.append(route.request.url)
            route.abort()

        page.route('**/sw.js', lambda route: route.abort())
        page.route('https://**/*', block_remote)
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("window.CentralPDFEngineStatus?.finishedAt !== null")
        assert not remote_requests, remote_requests
        assert page.evaluate("window.CentralPDFRemoteEngines.isAllowed()") is False

        page.evaluate("""async () => {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }""")
        page.evaluate("window.CentralPDFRemoteEngines.setAllowed(true)")
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function("window.CentralPDFEngineStatus?.finishedAt !== null")
        page.wait_for_timeout(250)
        assert remote_requests, 'A autorização explícita deveria habilitar as tentativas de CDN.'

        browser.close()
        print('remote-engine-consent: passed')
finally:
    server.shutdown()
    server.server_close()
