"""The installation marker remains available through a real Service Worker offline."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context()
        page=context.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
        page.wait_for_function('navigator.serviceWorker.controller')
        online=page.evaluate("async()=>await (await fetch('vendor/offline-status.js')).text()")
        assert 'CentralPDFOfflineStatus' in online
        context.set_offline(True)
        result=page.evaluate("async()=>{try {const r=await fetch('vendor/offline-status.js');return {ok:r.ok,text:await r.text()};}catch(e){return {ok:false,error:e.message};}}")
        assert result['ok'],result
        assert result['text']==online,result
        context.set_offline(False)
        browser.close()
    print('offline-marker-cache: real service worker marker fetch remains available offline')
finally:
    server.shutdown()
