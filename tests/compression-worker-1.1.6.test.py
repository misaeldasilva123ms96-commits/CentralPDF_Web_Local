from pathlib import Path
from playwright.sync_api import sync_playwright
import http.server
import threading

root = Path(__file__).resolve().parents[1]
engine = (root / 'assets/js/engine-loader.js').read_text(encoding='utf-8')
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')
planner = (root / 'assets/js/advanced-planner.js').read_text(encoding='utf-8')
index = (root / 'index.html').read_text(encoding='utf-8')

assert 'URL.createObjectURL' not in engine
assert 'new Blob' not in engine
assert 'importScripts(' not in engine
assert 'direct-file-esm-unsupported' in engine
assert 'pdfWorkerBlobWrapperDisabled: true' in engine
assert 'pdfJsEvalDisabled: true' in engine
assert "adaptiveCompression: 'multi-pass-target-selection'" in engine

assert 'Inteligente — equilíbrio e redução automática' in app
assert 'Forte — priorizar arquivo menor' in app
assert 'analyzeCompressionPages' in app
assert 'raster inteligente por conteúdo' in app
assert 'rasterCompressPdfAdaptive' in app
assert 'structuralCompressPdfBytes' in app
assert 'originalBytes.byteLength <= selected.bytes.byteLength' in app
assert 'RELATÓRIO DE COMPRESSÃO ADAPTATIVA' in app
assert 'Web local 1.2.1' in index

html = f'<!doctype html><html><head><base href="http://test.local/"></head><body><script>{planner}</script></body></html>'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page()
    page.set_content(html, wait_until='domcontentloaded')
    result = page.evaluate("""() => {
      const original = 1600000;
      const candidates = [
        { dpi: 120, quality: .72, bytes: new Uint8Array(1832095) },
        { dpi: 88, quality: .52, bytes: new Uint8Array(912683) }
      ];
      const selected = AdvancedPlanner.chooseCompressionCandidate(candidates, original, .25);
      const recommended = AdvancedPlanner.compressionProfile('recommended');
      const strong = AdvancedPlanner.compressionProfile('extreme');
      return {
        size: selected.bytes.byteLength,
        dpi: selected.dpi,
        reduction: selected.reduction,
        recommendedAttempts: recommended.attempts.length,
        recommendedTarget: recommended.targetReduction,
        strongAttempts: strong.attempts.length,
        strongTarget: strong.targetReduction,
      };
    }""")
    assert result['size'] == 912683
    assert result['dpi'] == 88
    assert result['reduction'] > .42
    assert result['recommendedAttempts'] == 3
    assert result['recommendedTarget'] == .50
    assert result['strongAttempts'] == 3
    assert result['strongTarget'] == .62
    browser.close()

engine_html = f"""<!doctype html><html><head><base href="http://test.local/"></head><body>
<script>
window.CentralPDFProtocolOverride='file:';
window.PDFLib={{PDFDocument:{{}}}};
window.pdfjsLib={{getDocument(){{}},GlobalWorkerOptions:{{}}}};
window.CentralPDFOfflineStatus={{pdfLib:true,pdfJs:true,pdfWorker:true}};
const originalAppend=document.head.appendChild.bind(document.head);
document.head.appendChild=function(node){{
  if(node?.dataset?.engine==='pdfWorkerMainThread'){{
    window.pdfjsWorker={{WorkerMessageHandler:{{test:true}}}};
    setTimeout(()=>node.onload?.(),0);
    return node;
  }}
  return originalAppend(node);
}};
</script>
<script>{engine}</script>
</body></html>"""
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page()
    page.set_content(engine_html, wait_until='domcontentloaded')
    page.wait_for_function("window.CentralPDFEngineStatus && window.CentralPDFEngineStatus.finishedAt")
    worker = page.evaluate("""() => ({
      status: window.CentralPDFGetPdfWorkerStatus(),
      workerSrc: String(window.pdfjsLib.GlobalWorkerOptions.workerSrc || ''),
      hasMainThreadHandler: Boolean(window.pdfjsWorker?.WorkerMessageHandler)
    })""")
    assert worker['status']['ready'] is False
    assert worker['status']['mode'] == 'direct-file-esm-unsupported'
    assert not worker['workerSrc'].startswith('blob:')
    assert worker['hasMainThreadHandler'] is False
    browser.close()

print('compression-worker-1.2.0: passed')
