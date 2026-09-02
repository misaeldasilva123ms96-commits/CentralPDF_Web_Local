from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import functools

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        return


handler = functools.partial(QuietHandler, directory=str(root))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_address[1]}"

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context()
        page = context.new_page()
        page.goto(f"{base}/tests/pdf-corpus/sw-harness.html")
        page.evaluate(
            """async () => {
              for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
              for (const key of await caches.keys()) await caches.delete(key);
              const old = await caches.open('centralpdf-v2.0.1-pages-19-core');
              await old.put('/assets/js/app.js?v=2.0.1-ui6', new Response('old-app'));
              await old.put('/assets/js/pdf-ingest.js?v=old', new Response('old-ingest'));
              await navigator.serviceWorker.register('/sw.js');
            }"""
        )
        page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=60_000)
        page.wait_for_function(
            """async () => {
              const keys = await caches.keys();
              return keys.includes('centralpdf-v2.0.1-pages-20-core')
                && !keys.includes('centralpdf-v2.0.1-pages-19-core');
            }""",
            timeout=60_000,
        )
        cached = page.evaluate(
            """async () => {
              const cache = await caches.open('centralpdf-v2.0.1-pages-20-core');
              const app = await cache.match('/assets/js/app.js?v=2.0.1-ui7');
              const ingest = await cache.match('/assets/js/pdf-ingest.js?v=2.0.1-ingest1');
              return {app: Boolean(app), ingest: Boolean(ingest)};
            }"""
        )
        assert cached == {"app": True, "ingest": True}, cached

        context.set_offline(True)
        offline = page.evaluate(
            """async () => ({
              app: (await (await fetch('/assets/js/app.js?v=2.0.1-ui7')).text()).includes('fileIngestChain'),
              ingest: (await (await fetch('/assets/js/pdf-ingest.js?v=2.0.1-ingest1')).text()).includes('inspectPdfFile')
            })"""
        )
        assert offline == {"app": True, "ingest": True}, offline
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("pdf-compatibility-sw: passed")
