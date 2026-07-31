from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
loader = (root / 'assets/js/engine-loader.js').read_text(encoding='utf-8')
html = f'''<!doctype html><html><head><meta charset="utf-8"><base href="http://test.local/"></head><body>
<script>
window.CentralPDFProtocolOverride = 'file:';
window.CentralPDFOfflineStatus = Object.freeze({{prepared:true,pdfLib:false,pdfJs:false,pdfWorker:true}});
window.PDFLib = {{ PDFDocument: {{}} }};
window.pdfjsLib = {{ getDocument() {{}}, GlobalWorkerOptions: {{workerPort:null,workerSrc:''}} }};
window.pdfjsWorker = {{ WorkerMessageHandler: {{}} }};
window.__workerConstructed = 0;
window.Worker = class {{ constructor() {{ window.__workerConstructed += 1; throw new Error('Worker compartilhado não deve ser criado'); }} }};
</script>
<script>{loader}</script>
</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html, wait_until='load')
    page.wait_for_function("window.CentralPDFEngineStatus && window.CentralPDFEngineStatus.finishedAt")
    values = page.evaluate("""() => ({
      ready: window.CentralPDFEngineStatus.ready,
      directFileMode: window.CentralPDFEngineStatus.directFileMode,
      worker: window.CentralPDFGetPdfWorkerStatus(),
      hasPort: Boolean(window.pdfjsLib.GlobalWorkerOptions.workerPort),
      workerSrc: String(window.pdfjsLib.GlobalWorkerOptions.workerSrc || ''),
      constructed: window.__workerConstructed,
      errors: window.CentralPDFEngineStatus.errors,
    })""")
    assert values['ready'] is True
    assert values['directFileMode'] is True
    assert values['worker']['ready'] is False
    assert values['worker']['mode'] == 'direct-file-esm-unsupported'
    assert values['hasPort'] is False
    assert values['workerSrc'] == ''
    assert values['constructed'] == 0
    assert values['errors'] == []
    assert errors == []
    browser.close()

print('pdf-worker-file-mode-1.2.0: passed')
