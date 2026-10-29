"""The CI browser guard must block Sentry while allowing explicit local routes."""
from pathlib import Path
import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('guard_runner', root/'scripts/run-browser-test.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
runner.install_guard()
received = []

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        received.append(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(200);self.end_headers();self.wfile.write(b'ok')
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
# DNS is mapped to the local receiver even if the guard regresses.
url = f'http://telemetry.sentry.io:{server.server_port}/api/456/envelope/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--host-resolver-rules=MAP telemetry.sentry.io 127.0.0.1'])
        context = browser.new_context()
        for page in [context.new_page(), browser.new_page()]:
            result = page.evaluate("""async url=>{try{await fetch(url,{method:'POST',mode:'no-cors',body:'probe'});return 'sent';}catch(error){return error.message;}}""", url)
            assert result == 'Sentry blocked by browser test runner', result
            assert not received, 'The default guard must stop the request before any receiver'
            # A dedicated test receiver route can override the default guard.
            page.evaluate('(url)=>window.__centralPdfTestLocalReceiver=url', url)
            page.context.route(url, lambda route: route.fulfill(status=200, body='local fixture', headers={'Access-Control-Allow-Origin':'*'}))
            assert page.evaluate("async url=>(await fetch(url)).text()", url) == 'local fixture'
            assert not received
        browser.close()
    print('browser-network-guard: contexts/pages blocked Sentry; explicit test routes remain usable')
finally:
    server.shutdown()
