"""Browser consent and real local HTTP envelope receiver; no remote uploads."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
dsn = 'https://11111111111111111111111111111111@o123.ingest.us.sentry.io/456'
endpoint = 'https://o123.ingest.us.sentry.io/api/456/envelope/'
html = (root / 'index.html').read_text()
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', '', html)
scripts = ['app/node_modules/pdf-lib/dist/pdf-lib.min.js', 'assets/js/pdf-ingest.js',
           'assets/js/split-planner.js', 'assets/js/advanced-planner.js', 'assets/js/pdf-native-text.js',
           'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js', 'assets/js/ux-enhancements.js',
           'assets/js/app.js', 'assets/js/layout-controls.js', 'assets/js/foundation.js',
           'assets/js/experience-0.15.js']
base = ''.join(f'<script src="/{name}"></script>' for name in scripts)
suffix = '<script src="/assets/js/diagnostics-telemetry.js"></script><script src="/assets/js/stable-1.0.js"></script><script>window.testReady=true;</script>'
received = []
responses = []

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/test'):
            config = '<script src="/assets/js/diagnostics-config.js"></script>' if self.path.startswith(('/test-disabled', '/test-production')) else '<script>window.CentralPDFDiagnosticsConfig={enabled:true,dsn:'+json.dumps(dsn)+'};</script>'
            if self.path.startswith('/test-disabled'):
                config += '<script>window.CentralPDFDiagnosticsConfig=Object.freeze({...window.CentralPDFDiagnosticsConfig,enabled:false});</script>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.replace('</body>', base+config+suffix+'</body>').encode())
        else:
            super().do_GET()
    def do_POST(self):
        assert self.path == '/receiver'
        raw = self.rfile.read(int(self.headers['Content-Length'])).decode()
        received.append(raw)
        status, headers = responses.pop(0) if responses else (200, {})
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Expose-Headers', 'X-Sentry-Rate-Limits, Retry-After')
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(b'{}')
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
headers_seen = []

def intercept(route):
    headers_seen.append(route.request.all_headers())
    response = route.fetch(url=origin+'/receiver', max_redirects=0)
    route.fulfill(response=response)

def setup(browser, disabled=False, mobile=False, production=False):
    context = browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000}, service_workers='block')
    context.sentry_requests = []
    context.on('request', lambda request: context.sentry_requests.append(request.url) if '.sentry.io/' in request.url else None)
    # Every external request is blocked except the explicit local-only receiver route.
    context.route(re.compile(r'^https?://(?!127\.0\.0\.1:)'), lambda route: route.abort())
    context.route(endpoint, intercept)
    context.add_cookies([{'name':'private_session','value':'SECRET_COOKIE','domain':'o123.ingest.us.sentry.io','path':'/','secure':True}])
    context.add_init_script('''if(!localStorage.getItem('centralpdf-1.0-errors'))localStorage.setItem('centralpdf-1.0-errors',JSON.stringify([{time:new Date().toISOString(),kind:'console',message:'OLD_SECRET_FILENAME.pdf',source:'console.error',count:99}]));''')
    page = context.new_page()
    page.goto(origin+('/test-disabled' if disabled else '/test-production' if production else '/test')+'?private=SECRET_URL')
    page.wait_for_function('window.testReady && document.querySelector("#cpTelemetryPanel")')
    page.evaluate('document.querySelector("#cp10Quality").showModal()')
    return context, page

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
        disabled, off = setup(browser, disabled=True)
        assert off.locator('#cpTelemetryConsent').is_disabled()
        off.evaluate("CentralPDFStable.addLog('console','disabled SECRET.pdf');CentralPDFTelemetry.setConsent(true);CentralPDFTelemetry.flush()")
        assert len(received) == 0
        disabled.close()
        production, prod = setup(browser, production=True)
        assert prod.evaluate('CentralPDFTelemetry.getStatus().configured')
        assert not prod.locator('#cpTelemetryConsent').is_checked()
        assert not prod.locator('#cpTelemetryConsent').is_disabled()
        prod.evaluate("CentralPDFStable.addLog('console','before authorization');CentralPDFTelemetry.flush()")
        assert not prod.evaluate('CentralPDFTelemetry.getStatus().consent')
        assert not prod.evaluate('CentralPDFTelemetry.sendTest()')
        assert not production.sentry_requests
        assert len(received) == 0
        production.close()
        a, owner = setup(browser)
        b, visitor = setup(browser, mobile=True)
        assert not owner.locator('#cpTelemetryConsent').is_checked()
        owner.locator('#cpTelemetryConsent').check()
        owner.evaluate('CentralPDFTelemetry.flush()')
        assert len(received) == 0, 'Historical logs must not be replayed after consent'
        owner.evaluate("for(let i=0;i<3;i++)CentralPDFStable.addLog('javascript','PRIVATE_DOCUMENT_TEXT João SECRET_FILE.pdf','https://private.invalid/assets/js/pdf-editor.js?SECRET=1');CentralPDFTelemetry.flush()")
        owner.wait_for_function('CentralPDFTelemetry.getStatus().sent===1')
        event = json.loads(received[0].splitlines()[2])
        assert event['extra']['occurrences'] == 3
        assert event['tags']['component'] == 'pdf-editor.js'
        assert len(received) == 1
        visitor.evaluate("CentralPDFStable.addLog('console','unconsented visitor');CentralPDFTelemetry.flush()")
        assert len(received) == 1, 'Independent browsers must opt in separately'
        visitor.locator('#cpTelemetryConsent').check()
        visitor.locator('#cpTelemetryTest').click()
        visitor.wait_for_function('CentralPDFTelemetry.getStatus().sent===1')
        assert json.loads(received[1].splitlines()[2])['tags']['code'] == 'diagnostic_test'
        assert visitor.locator('#cpTelemetryPanel').evaluate('(el)=>el.scrollWidth <= el.clientWidth+1')
        a.set_offline(True)
        owner.evaluate("CentralPDFStable.addLog('console','OFFLINE_SECRET.pdf');CentralPDFTelemetry.flush()")
        assert owner.evaluate('CentralPDFTelemetry.getStatus().pending') == 1
        assert len(received) == 2
        a.set_offline(False)
        owner.evaluate('CentralPDFTelemetry.flush()')
        owner.wait_for_function('CentralPDFTelemetry.getStatus().sent===2')
        assert len(received) == 3
        # A second tab inherits consent, and revocation propagates through storage.
        sibling = a.new_page()
        sibling.goto(origin+'/test')
        sibling.wait_for_function('window.testReady')
        assert sibling.evaluate('CentralPDFTelemetry.getStatus().consent')
        owner.locator('#cpTelemetryConsent').uncheck()
        sibling.wait_for_function('!CentralPDFTelemetry.getStatus().consent')
        sibling.evaluate("CentralPDFStable.addLog('console','revoked');CentralPDFTelemetry.flush()")
        assert len(received) == 3
        owner.locator('#cpTelemetryConsent').check()
        responses.append((429, {'Retry-After':'60'}))
        owner.locator('#cpTelemetryTest').click()
        owner.wait_for_function('CentralPDFTelemetry.getStatus().lastResult==="limited"')
        owner.evaluate("CentralPDFStable.addLog('console','rate limited');CentralPDFTelemetry.flush()")
        assert len(received) == 4
        owner.locator('#cp10ClearErrors').click()
        assert owner.evaluate('CentralPDFStable.getErrors().length') == 0
        assert len(received) == 4, 'Clearing local logs must not claim to erase received events'
        for raw in received:
            for secret in ['SECRET', 'PRIVATE_DOCUMENT_TEXT', 'private.invalid', 'João', 'OLD_', 'OFFLINE_', 'Cookie', 'userAgent']:
                assert secret not in raw, (secret, raw)
            envelope, item, event = map(json.loads, raw.splitlines())
            assert item['length'] == len(raw.splitlines()[2].encode())
            assert envelope['event_id'] == event['event_id']
        for headers in headers_seen:
            assert 'cookie' not in headers
            assert 'referer' not in headers
        a.close(); b.close(); browser.close()
    print('Browser diagnostics: two independent clients, local envelope receiver, private payload, consent, offline, revocation, 429 and mobile UI passed')
finally:
    server.shutdown()
