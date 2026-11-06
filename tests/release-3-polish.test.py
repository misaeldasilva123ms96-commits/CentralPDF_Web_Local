"""Real 3.0 surfaces and ingestion: hover parity, overlap, loading and PDF export."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from tempfile import TemporaryDirectory
import json, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('CENTRALPDF_RELEASE_EVIDENCE', '/tmp/centralpdf-release-3'))
OUT.mkdir(parents=True, exist_ok=True)
# Use the pinned npm parser in the CI job; Pages separately exercises prepared engines/offline.
HTML = (ROOT / 'index.html').read_text().replace('<script src="assets/js/engine-loader.js"></script>', '<script src="app/node_modules/pdf-lib/dist/pdf-lib.min.js"></script>')
HTML = HTML.replace('</body>', '<script type="module">import * as pdfjs from "/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs";window.pdfjsLib=pdfjs;pdfjs.GlobalWorkerOptions.workerSrc="/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs";</script></body>')
class Handler(SimpleHTTPRequestHandler):
 def log_message(self, *args): pass
 def do_GET(self):
  if self.path == '/':
   self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers(); self.wfile.write(HTML.encode())
  else: super().do_GET()
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
results = []
try:
 with TemporaryDirectory() as tmp, sync_playwright() as p:
  for engine in ['chromium', 'firefox']:
   browser = getattr(p, engine).launch()
   for width, theme in [(1440, 'dark'), (390, 'light')]:
    context = browser.new_context(viewport={'width': width, 'height': 960}, reduced_motion='reduce', accept_downloads=True, service_workers='block')
    context.add_init_script(f"localStorage.setItem('centralpdf_theme_preference','{theme}')")
    context.route('https://**/*', lambda route: route.abort())
    page = context.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(f'http://127.0.0.1:{server.server_port}/')
    page.wait_for_function('window.CentralPDFApp && window.PDFLib && window.pdfjsLib && window.CentralPDFImportFeedback')
    cards = page.locator('.tool-card[data-tool]'); assert cards.count() == 39
    for index in range(cards.count()):
     card = cards.nth(index)
     page.mouse.move(0, 0)
     before = card.evaluate('e=>getComputedStyle(e).backgroundColor')
     card.hover()
     after = card.evaluate('e=>getComputedStyle(e).backgroundColor')
     assert before != after, (engine, width, 'missing hover', card.get_attribute('data-tool'))
    page.mouse.move(0, 0); page.evaluate('scrollTo(0,0)')
    assert page.locator('.search-box').evaluate('e=>parseFloat(getComputedStyle(e).borderRadius)') >= 28
    page.screenshot(path=str(OUT / f'home-{engine}-{width}.png'))
    # Diagnose is the real dialog that contains access + usage consent.
    page.evaluate('document.querySelector("#foundationDiagnosticsButton").click()')
    card = page.locator('#cpAdminAccess'); card.wait_for()
    card.scroll_into_view_if_needed()
    layout = card.evaluate('''e=>{const a=e.querySelector('a').getBoundingClientRect(),l=e.querySelector('label').getBoundingClientRect();return {linkBottom:a.bottom,labelTop:l.top,overflow:e.scrollWidth>e.clientWidth+1}}''')
    assert layout['linkBottom'] + 5 <= layout['labelTop'] and not layout['overflow'], layout
    page.screenshot(path=str(OUT / f'diagnostics-{engine}-{width}.png'))
    page.keyboard.press('Escape')
    # A genuine larger PDF, generated on-device. It includes native selectable text.
    payload = page.evaluate('''async()=>{const doc=await PDFLib.PDFDocument.create();for(let i=0;i<40;i++){const page=doc.addPage();page.drawText('CentralPDF QA page '+(i+1));}const bytes=await doc.save();return [...bytes];}''')
    pdf = Path(tmp) / 'Documento de teste.pdf'; pdf.write_bytes(bytes(payload))
    for tool in ['merge', 'split', 'organize', 'editPdf']:
     page.evaluate('(tool)=>CentralPDFApp.selectTool(tool)', tool)
     assert page.locator('#sidebarBackdrop').is_hidden(), (engine, width, 'backdrop consumed grid column')
     # Hold the parser briefly to inspect the genuine loading UI deterministically.
     page.evaluate('''()=>{window.qaParse=PDFLib.PDFDocument.load;window.qaGate=new Promise(resolve=>window.qaRelease=resolve);PDFLib.PDFDocument.load=async(...args)=>{await qaGate;return qaParse.apply(PDFLib.PDFDocument,args);};}''')
     page.locator('#fileInput').set_input_files(str(pdf))
     panel = page.locator('#fileReadProgress'); panel.wait_for(state='visible')
     assert page.locator('#fileSection').get_attribute('aria-busy') == 'true'
     page.screenshot(path=str(OUT / f'loading-before-{tool}-{engine}-{width}.png'))
     if panel.locator('details').get_attribute('open') is None: panel.locator('summary').click()
     assert panel.locator('details').get_attribute('open') is not None
     page.screenshot(path=str(OUT / f'loading-{tool}-{engine}-{width}.png'))
     page.evaluate('qaRelease()')
     panel.wait_for(state='hidden', timeout=90000)
     page.evaluate('()=>{PDFLib.PDFDocument.load=qaParse;}')
     assert page.evaluate('CentralPDFApp.getFiles().length') == 1
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), (engine, width, tool)
     # Visible settings labels must contain their text, including wrapped mobile rows.
     assert page.locator('.settings-panel .toggle-row:visible').evaluate_all('''rows=>rows.every(e=>{const r=e.getBoundingClientRect();return [...e.children].every(c=>c.getBoundingClientRect().bottom<=r.bottom+2)})'''), (engine, width, tool, 'settings overlap')
     page.screenshot(path=str(OUT / f'{tool}-{engine}-{width}.png'))
    # Actual organize download and native reopen, rather than just a success message.
    page.evaluate("CentralPDFApp.selectTool('organize')")
    page.locator('#fileInput').set_input_files(str(pdf)); page.locator('#fileReadProgress').wait_for(state='hidden', timeout=90000)
    page.wait_for_function('CentralPDFApp.getFiles().length===1 && !document.querySelector("#processButton").disabled')
    with page.expect_download() as download: page.locator('#processButton').click()
    exported = list(Path(download.value.path()).read_bytes())
    assert page.evaluate('async b=>(await PDFLib.PDFDocument.load(new Uint8Array(b))).getPageCount()', exported) == 40
    page.locator('#continueEditingButton').click()
    # Rejection and tool changes must also clear the indicator.
    bad = Path(tmp) / 'Inválido.pdf'; bad.write_bytes(b'invalid PDF data')
    page.evaluate("CentralPDFApp.selectTool('split')"); page.locator('#fileInput').set_input_files(str(bad))
    page.locator('#fileReadProgress').wait_for(state='hidden', timeout=60000)
    assert page.evaluate('CentralPDFApp.getFiles().length') == 0
    # Switching tools during a pending parse must discard the old import and its feedback.
    page.evaluate('''data=>{window.qaParse=PDFLib.PDFDocument.load;window.qaGate=new Promise(resolve=>window.qaRelease=resolve);PDFLib.PDFDocument.load=async(...args)=>{await qaGate;return qaParse.apply(PDFLib.PDFDocument,args);};window.qaPending=CentralPDFApp.openFilesInTool([new File([new Uint8Array(data)],'Importação pendente.pdf',{type:'application/pdf'})],'split');}''', payload)
    page.locator('#fileReadProgress').wait_for(state='visible')
    page.evaluate("CentralPDFApp.selectTool('organize')")
    assert page.locator('#fileReadProgress').is_hidden()
    page.evaluate('async()=>{qaRelease();await qaPending;PDFLib.PDFDocument.load=qaParse;}')
    assert page.evaluate('CentralPDFApp.getFiles().length') == 0
    assert not errors, errors
    results.append({'browser': engine, 'width': width, 'theme': theme, 'hover_cards': 39, 'pdf_pages_exported': 40, 'overlap': False})
    context.close()
   browser.close()
finally: server.shutdown()
(OUT / 'report.json').write_text(json.dumps(results, indent=2))
print('release-3-polish: passed', results)
