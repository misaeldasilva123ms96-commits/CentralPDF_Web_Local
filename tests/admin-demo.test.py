"""A planning-only prototype: no credentials, external requests or product writes."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from threading import Thread
from tempfile import TemporaryDirectory
from os import environ
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]/'examples/admin-demo'
temporary=TemporaryDirectory(prefix='centralpdf-admin-demo-')
OUT=Path(environ.get('CENTRALPDF_QA_SCREENSHOTS') or temporary.name)
OUT.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  for engine in ['chromium','firefox']:
   browser=getattr(p,engine).launch()
   for width,height in [(1440,1000),(390,844)]:
    context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',accept_downloads=True)
    page=context.new_page();errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);context.on('request',lambda r:requests.append(r.url))
    page.goto(origin);assert page.get_by_role('heading',name='Visão geral',exact=True).is_visible()
    assert page.locator('#total-count').inner_text()=='1.284'
    for theme in ['light','dark']:
     if page.locator('body').get_attribute('data-theme')!=theme:page.locator('#theme').click()
     assert page.locator('#theme').get_attribute('aria-checked')==str(theme=='dark').lower()
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     page.screenshot(path=str(OUT/f'admin-overview-{engine}-{width}-{theme}.png'),full_page=True)
    page.locator('#period').select_option('today');assert page.locator('#total-count').inner_text()=='254'
    page.locator('#period').select_option('week')
    with page.expect_download() as dl:page.get_by_role('button',name='Exportar resumo').click()
    download=dl.value;assert download.suggested_filename=='CentralPDF — resumo demonstrativo.csv'
    raw=Path(download.path()).read_text('utf-8-sig');assert 'DADOS FICTÍCIOS' in raw and 'Juntar PDFs;412;409;3' in raw
    def nav(key):
     if width<800:page.locator('#menu-button').click()
     page.locator(f'#navigation a[href="#{key}"]').click()
     page.get_by_role('heading',name={'overview':'Visão geral','tools':'Ferramentas','diagnostics':'Diagnósticos','announcements':'Avisos','settings':'Ajustes','history':'Histórico'}[key],exact=True).wait_for()
    nav('tools');page.locator('#tool-search').fill('OCR');assert page.locator('tbody tr').count()==1
    page.locator('#tool-search').fill('inexistente');assert 'Nenhuma ferramenta' in page.locator('tbody').inner_text()
    page.locator('#tool-search').fill('');page.locator('#tool-sort').select_option('failures');assert 'Editar PDF' in page.locator('tbody tr').first.inner_text()
    nav('diagnostics');page.locator('#severity').select_option('error');assert page.locator('tbody tr').count()==1
    page.get_by_role('button',name='Ver detalhes').first.click();assert page.locator('#details-dialog').is_visible()
    page.locator('#analyze-error').click();assert 'Analisado (demo)' in page.locator('tbody').inner_text()
    nav('announcements');page.locator('#notice-title').fill('Primeiro aviso');page.locator('#notice-message').fill('Mensagem demonstrativa para revisão.')
    page.locator('#publish-notice').click();assert page.locator('#confirm-dialog').is_visible();page.locator('#confirm-notice').click()
    nav('overview');assert 'Primeiro aviso' in page.locator('#published-preview').inner_text()
    nav('announcements');page.locator('#notice-title').fill('Rascunho ainda privado');page.locator('#notice-message').fill('Outra mensagem que não deve ser publicada.');page.locator('#save-draft').click()
    nav('overview');assert 'Primeiro aviso' in page.locator('#published-preview').inner_text(),'saving a draft must not replace the published preview'
    nav('settings');page.locator('#setting-notice').uncheck();page.locator('#save-settings').click();nav('overview');assert page.locator('#published-preview').is_hidden()
    nav('history');assert page.locator('tbody tr').count()>=4
    page.locator('#access-button').click();assert page.locator('#demo-email').is_disabled() and page.locator('#demo-password').is_disabled()
    page.screenshot(path=str(OUT/f'admin-access-{engine}-{width}.png'),full_page=False)
    page.locator('#enter-demo').click();assert page.locator('#access-dialog').is_hidden()
    page.reload();assert 'Nenhuma alteração' in page.locator('tbody').inner_text()
    assert all(r.startswith(origin) for r in requests),requests
    assert not errors,errors
    context.close()
   # Standalone downloaded HTML works with the browser offline.
   context=browser.new_context(offline=True);page=context.new_page();page.goto(ROOT.joinpath('index.html').as_uri());assert page.get_by_role('heading',name='Visão geral',exact=True).is_visible();context.close();browser.close()
 print('Prototype: themes, desktop/mobile, filter, CSV, search, diagnostics, draft/publication separation, settings, history, access preview, reset, offline and no remote requests passed')
finally:
 server.shutdown()
 temporary.cleanup()
