from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import functools
import os
import re

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]


# Model the previous cache-first worker independently of Git history (CI uses
# shallow checkouts). Keep the real cache names and affected script URLs.
old_worker = b"""
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method==='GET')event.respondWith(
    caches.match(event.request).then(cached=>cached || fetch(event.request)));
});
"""
updated = False
http_error = 0


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] in ['/assets/js/pdf-native-text.js','/assets/js/missing-review-fixture.js'] and http_error:
            self.send_response(http_error)
            self.end_headers()
            self.wfile.write(b'Temporary origin error')
        elif self.path == '/sw.js' and not updated:
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.end_headers()
            self.wfile.write(old_worker)
        else:
            super().do_GET()

    def log_message(self, _format, *_args):
        return


handler = functools.partial(QuietHandler, directory=str(root))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_address[1]}"

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context()
        page = context.new_page()
        page.goto(f"{base}/tests/pdf-corpus/sw-harness.html")
        page.evaluate("async () => { await navigator.serviceWorker.register('/sw.js'); }")
        page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=60_000)
        page.evaluate("""async () => {
          const old = await caches.open('centralpdf-v2.0.1-pages-30-core');
          await old.put('/assets/js/app.js?v=2.0.1-ui10', new Response('old-app'));
          await old.put('/assets/js/pdf-native-text.js', new Response('old-native'));
        }""")
        assert page.evaluate("async () => (await (await fetch('/assets/js/pdf-native-text.js')).text())") == 'old-native'
        opaque_url=f'http://localhost:{server.server_address[1]}/tests/pdf-corpus/sw-harness.html'
        engines={
            'pdf':'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/pdf.min.mjs',
            'ocr':'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
            'opaque':opaque_url,
        }
        page.evaluate("""async urls => {
          localStorage.setItem('centralpdf-offline-prepared','prepared-before-upgrade');
          const old=await caches.open('centralpdf-v2.0.1-pages-30-runtime');
          await old.put(urls.pdf,new Response('old-pdf-engine'));
          await old.put(urls.ocr,new Response('prepared-ocr-engine'));
          const opaque=await fetch(urls.opaque,{mode:'no-cors'});
          if(opaque.type!=='opaque')throw Error('Opaque fixture not created');
          await old.put(urls.opaque,opaque);
          await old.put('/assets/js/app.js?v=2.0.1-ui10',new Response('stale-runtime-app'));
          await old.put('/assets/js/stale-only.js',new Response('do-not-migrate'));
          // A newer engine copy already stored by another tab must win.
          await (await caches.open('centralpdf-v2.0.1-pages-32-runtime')).put(urls.pdf,new Response('newer-pdf-engine'));
        }""",engines)

        # New HTML must bypass old script URLs on the very first reload, even
        # before the new worker activates.
        urls=re.findall(r'<script src="([^"]+)"', (root/'index.html').read_text())
        for module, marker in [('app.js','function baseName'),('pdf-native-text.js','cidByteWidth')]:
            url=next('/'+url for url in urls if '/'+module+'?' in url)
            assert marker in page.evaluate("async url => (await (await fetch(url)).text())",url)
        updated = True
        page.evaluate("""async () => {
          const registration=await navigator.serviceWorker.getRegistration();
          await registration.update();
          const next=registration.installing || registration.waiting;
          if(next)await new Promise((resolve,reject)=>{
            next.addEventListener('statechange',()=>{
              if(next.state==='activated')resolve();
              if(next.state==='redundant')reject(new Error('Updated worker failed to install'));
            });
            if(next.state==='activated')resolve();
          });
        }""")
        fetched = page.evaluate("""async () => ({
          app: await (await fetch('/assets/js/app.js?v=2.0.1-ui10')).text(),
          native: await (await fetch('/assets/js/pdf-native-text.js')).text(),
          keys: await caches.keys()
        })""")
        assert 'function baseName' in fetched['app'], 'Stale download helper served'
        assert 'cidByteWidth' in fetched['native'], 'Stale native editor served'
        assert 'centralpdf-v2.0.1-pages-30-core' not in fetched['keys'], fetched['keys']
        assert 'centralpdf-v2.0.1-pages-30-runtime' not in fetched['keys'], fetched['keys']
        migrated=page.evaluate("""async urls => {
          const runtime=await caches.open('centralpdf-v2.0.1-pages-32-runtime');
          const pdf=await runtime.match(urls.pdf),ocr=await runtime.match(urls.ocr),opaque=await runtime.match(urls.opaque);
          return {
            pdf:pdf && await pdf.text(),ocr:ocr && await ocr.text(),opaque:opaque?.type,
            marker:localStorage.getItem('centralpdf-offline-prepared')
          };
        }""",engines)
        assert migrated=={'pdf':'newer-pdf-engine','ocr':'prepared-ocr-engine','opaque':'opaque','marker':'prepared-before-upgrade'},migrated

        assert page.evaluate("async () => Boolean(await (await caches.open('centralpdf-v2.0.1-pages-32-runtime')).match('/assets/js/stale-only.js'))") is False
        # A stale entry for an unversioned URL must also refresh online, and the
        # most recently fetched code must remain available offline.
        page.evaluate("""async () => {
          const key=(await caches.keys()).find(k=>k.endsWith('-core'));
          await (await caches.open(key)).put('/assets/js/pdf-native-text.js',new Response('stale-current-core'));
        }""")
        current = page.evaluate("async () => (await (await fetch('/assets/js/pdf-native-text.js')).text())")
        assert 'cidByteWidth' in current, 'Online scripts did not refresh'
        for status in [404,500]:
            http_error=status
            fallback=page.evaluate("async () => {const r=await fetch('/assets/js/pdf-native-text.js');return {status:r.status,text:await r.text()};}")
            assert fallback=={'status':200,'text':current},(status,fallback)
            # Versioned URL has only its install-time core copy available.
            core_url=next('/'+url for url in urls if '/pdf-native-text.js?' in url)
            core_fallback=page.evaluate("async url => {const r=await fetch(url);return {status:r.status,text:await r.text()};}",core_url)
            assert core_fallback=={'status':200,'text':current},(status,core_fallback)
            uncached=page.evaluate("async () => {const r=await fetch('/assets/js/missing-review-fixture.js');return {status:r.status,text:await r.text()};}")
            assert uncached=={'status':status,'text':'Temporary origin error'},uncached

        http_error=0

        context.set_offline(True)
        offline = page.evaluate("async () => (await (await fetch('/assets/js/pdf-native-text.js')).text())")
        assert offline == current, 'Offline fallback did not use refreshed script'
        offline_engines=page.evaluate("""async urls => ({
          pdf:await (await fetch(urls.pdf)).text(),
          ocr:await (await fetch(urls.ocr)).text(),
          opaque:(await fetch(urls.opaque,{mode:'no-cors'})).type
        })""",engines)
        assert offline_engines=={'pdf':'newer-pdf-engine','ocr':'prepared-ocr-engine','opaque':'opaque'},offline_engines

        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("cached-editor-downloads: upgrade, online refresh and offline fallback passed")
