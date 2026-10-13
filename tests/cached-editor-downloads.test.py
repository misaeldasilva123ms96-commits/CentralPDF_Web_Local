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


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/sw.js' and not updated:
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
        # A stale entry for an unversioned URL must also refresh online, and the
        # most recently fetched code must remain available offline.
        page.evaluate("""async () => {
          const key=(await caches.keys()).find(k=>k.endsWith('-core'));
          await (await caches.open(key)).put('/assets/js/pdf-native-text.js',new Response('stale-current-core'));
        }""")
        current = page.evaluate("async () => (await (await fetch('/assets/js/pdf-native-text.js')).text())")
        assert 'cidByteWidth' in current, 'Online scripts did not refresh'
        context.set_offline(True)
        offline = page.evaluate("async () => (await (await fetch('/assets/js/pdf-native-text.js')).text())")
        assert offline == current, 'Offline fallback did not use refreshed script'
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("cached-editor-downloads: upgrade, online refresh and offline fallback passed")
