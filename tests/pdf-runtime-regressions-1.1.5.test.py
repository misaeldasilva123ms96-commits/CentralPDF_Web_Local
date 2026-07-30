from pathlib import Path
from playwright.sync_api import sync_playwright
import re

root = Path(__file__).resolve().parents[1]
engine = (root/'assets/js/engine-loader.js').read_text(encoding='utf-8')
app = (root/'assets/js/app.js').read_text(encoding='utf-8')
stable = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')

# Static regression: never create or assign one shared Worker port.
assert 'workerPort = new Worker' not in engine
assert 'options.workerPort = workerPort' not in engine
assert "pdfWorkerLifecycle: runtimeProtocol === 'file:' ? 'main-thread-file-safe' : 'worker-src-per-document'" in engine
assert 'await loadPdfWorkerOnMainThread(sourceUrl, source)' in engine
assert 'options.workerSrc = sourceUrl' in engine
assert 'pdfWorkerBlobWrapperDisabled: true' in engine

# Static regression: PDF.js and pdf-lib receive separate byte copies.
block = re.search(r'async function rasterCompressPdfAdvanced\([\s\S]*?\n  }\n\n  async function pdfToImage', app)
assert block, 'rasterCompressPdfAdvanced not found'
code = block.group(0)
assert 'const originalBytes = new Uint8Array(await file.arrayBuffer())' in code
assert 'const pdfJsBytes = originalBytes.slice()' in code
assert 'const pdfLibBytes = originalBytes.slice()' in code
assert 'getDocument({ data: pdfJsBytes })' in code
assert 'PDFDocument.load(pdfLibBytes)' in code
assert 'await loadingTask.destroy()' in code

# Legacy logs from fixed failures are migrated out of the active list.
assert 'detached ArrayBuffer' in stable
assert 'worker is being destroyed' in stable
assert "Failed to execute 'importScripts'" in stable

# Runtime regression: file mode uses PDF.js fake worker on the main thread,
# without constructing a shared Worker or a blob wrapper.
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page()
    page.set_content('<!doctype html><html><head></head><body></body></html>')
    page.evaluate("""() => {
      window.CentralPDFProtocolOverride = 'file:';
      window.CentralPDFOfflineStatus = {pdfLib:false,pdfJs:false,pdfWorker:true};
      window.PDFLib = {PDFDocument:{}};
      window.pdfjsLib = {getDocument(){}, GlobalWorkerOptions:{workerPort:null,workerSrc:''}};
      window.pdfjsWorker = {WorkerMessageHandler:{}};
      window.__workerConstructed = 0;
      window.Worker = class { constructor(){ window.__workerConstructed += 1; throw new Error('shared Worker must not be constructed'); } };
    }""")
    page.add_script_tag(content=engine)
    page.evaluate("() => window.CentralPDFEnginesReady")
    values = page.evaluate("""() => ({
      workerSrc: window.pdfjsLib.GlobalWorkerOptions.workerSrc,
      workerPort: window.pdfjsLib.GlobalWorkerOptions.workerPort,
      constructed: window.__workerConstructed,
      status: window.CentralPDFGetPdfWorkerStatus(),
      fixes: window.CentralPDFRuntimeFixes
    })""")
    assert values['workerSrc'].endswith('/pdf.worker.min.js')
    assert values['workerPort'] is None
    assert values['constructed'] == 0
    assert values['status']['ready'] is True
    assert values['status']['mode'] == 'main-thread-file-safe'
    assert values['fixes']['pdfWorkerBlobWrapperDisabled'] is True
    browser.close()

print('pdf-runtime-regressions-1.2.0: passed')
