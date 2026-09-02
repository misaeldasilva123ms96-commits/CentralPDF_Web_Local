from pathlib import Path
import re

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>', '', html)
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)

mock = r'''
<script>
window.PDFLib = {
  PDFDocument: {
    load: async (_bytes, options = {}) => {
      const gate = window.__helperLoadGate;
      if (!Object.prototype.hasOwnProperty.call(options, 'updateMetadata') && gate) {
        window.__helperLoadStarted = true;
        await gate;
      }
      const pageCount = Number(window.__mockPageCount || 1);
      return {
        getPageCount: () => pageCount,
        getPageIndices: () => Array.from({length: pageCount}, (_, index) => index),
        getPage: () => ({ getSize: () => ({ width: 595, height: 842 }), getRotation: () => ({angle: 0}) }),
        getTitle: () => '', getAuthor: () => '', getSubject: () => '', getKeywords: () => [],
        getCreator: () => '', getProducer: () => ''
      };
    }
  },
  degrees: value => value,
  StandardFonts: { HelveticaBold: 'HelveticaBold' },
  rgb: () => ({})
};
window.__startHelperLoadGate = () => {
  window.__helperLoadStarted = false;
  window.__helperLoadGate = new Promise(resolve => {
    window.__releaseHelperLoad = () => {
      window.__helperLoadGate = null;
      resolve();
    };
  });
};
window.fetch = async () => ({ok: true, text: async () => ''});
</script>
'''

scripts = '\n'.join((root / name).read_text(encoding='utf-8') for name in [
    'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
    'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
    'assets/js/ux-enhancements.js', 'assets/js/pdf-ingest.js',
    'assets/js/app.js', 'assets/js/layout-controls.js'
])
html = html.replace('</body>', mock + f'<script>{scripts}</script></body>')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    )
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(html, wait_until='domcontentloaded')
    page.locator('.tool-card[data-tool="merge"]').click()

    page.evaluate(r'''() => {
      const valid = new Uint8Array([37,80,68,70,45,49,46,55]);
      const transfer = new DataTransfer();
      transfer.items.add(new File([valid], 'mime-vazio.pdf', {type: ''}));
      transfer.items.add(new File([valid], 'octet.pdf', {type: 'application/octet-stream'}));
      for (let index = 3; index <= 19; index += 1) {
        transfer.items.add(new File([valid], `lote-${index}.pdf`, {type: 'application/pdf'}));
      }
      transfer.items.add(new File([new TextEncoder().encode('não é PDF')], 'falso.pdf', {type: 'application/pdf'}));
      const target = document.querySelector('#dropzone');
      target.dispatchEvent(new DragEvent('drop', {dataTransfer: transfer, bubbles: true, cancelable: true}));
    }''')

    page.wait_for_function("CentralPDFApp.getFiles().length === 19")
    page.wait_for_function(r'''() => {
      const text = document.querySelector('#statusBox')?.innerText || '';
      return text.includes('falso.pdf') && text.includes('não corresponde a um PDF');
    }''')
    status = page.locator('#statusBox').inner_text()
    loaded_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    assert 'mime-vazio.pdf' in loaded_names
    assert 'octet.pdf' in loaded_names
    assert 'falso.pdf' not in loaded_names
    assert 'falso.pdf' in status
    assert 'não corresponde a um PDF' in status

    page.evaluate(r'''() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'seletor.pdf', {type: ''}));
      const input = document.querySelector('#fileInput');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }''')
    page.wait_for_function("CentralPDFApp.getFiles().length === 20")
    assert page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")[-1] == 'seletor.pdf'

    page.evaluate(r'''() => {
      let releaseEngines;
      const engineGate = new Promise(resolve => { releaseEngines = resolve; });
      window.__releaseIngestEngines = releaseEngines;
      window.__ingestWaitStarted = false;
      window.CentralPDFEnginesReady = {
        catch: () => {
          window.__ingestWaitStarted = true;
          return engineGate;
        }
      };
      const valid = new Uint8Array([37,80,68,70,45,49,46,55]);
      const file = new File([valid], 'sessao-antiga.pdf', {type: 'application/pdf'});
      window.__pendingIngest = CentralPDFApp.openFilesInTool([file], 'merge');
    }''')
    page.wait_for_function("window.__ingestWaitStarted === true")
    page.evaluate(r'''async () => {
      CentralPDFApp.selectTool('split');
      window.__releaseIngestEngines();
      await window.__pendingIngest;
    }''')
    assert page.evaluate("CentralPDFApp.getActiveTool()") == 'split'
    assert page.evaluate("CentralPDFApp.getFiles().length") == 0
    assert page.locator('#statusBox').inner_text() == 'Adicione um arquivo para continuar.'

    page.evaluate(r'''async () => {
      const bytes = new Uint8Array([37,80,68,70,45,49,46,55]);
      await CentralPDFApp.openFilesInTool([new File([bytes], 'organizador-ativo.pdf', {type: 'application/pdf'})], 'organize');
    }''')
    assert page.locator('#pageGrid .page-card').count() == 1
    assert '1 PDF(s) adicionado(s)' in page.locator('#statusBox').inner_text()

    page.evaluate(r'''async () => {
      const bytes = new Uint8Array([37,80,68,70,45,49,46,55]);
      await CentralPDFApp.openFilesInTool([new File([bytes], 'divisao-ativa.pdf', {type: 'application/pdf'})], 'split');
    }''')
    assert 'divisao-ativa.pdf' in page.locator('#splitDocumentInfo').inner_text()
    assert page.locator('#splitPlanCount').inner_text() == '1 arquivo'
    assert not page.locator('#processButton').is_disabled()

    # A session can also become stale inside the organizer/split helpers, after
    # inspection has completed but while pdf-lib is still loading the document.
    page.evaluate(r'''() => {
      window.__startHelperLoadGate();
      const file = new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'organizador-antigo.pdf', {type: 'application/pdf'});
      window.__pendingHelperIngest = CentralPDFApp.openFilesInTool([file], 'organize');
    }''')
    page.wait_for_function("window.__helperLoadStarted === true")
    page.evaluate(r'''async () => {
      CentralPDFApp.selectTool('split');
      window.__releaseHelperLoad();
      await window.__pendingHelperIngest;
    }''')
    assert page.evaluate("CentralPDFApp.getActiveTool()") == 'split'
    assert page.evaluate("CentralPDFApp.getFiles().length") == 0
    assert page.locator('#pageGrid .page-card').count() == 0
    assert page.locator('#pageCountLabel').inner_text() == '0 páginas'
    assert page.locator('#statusBox').inner_text() == 'Adicione um arquivo para continuar.'
    assert page.locator('#progressTrack').is_hidden()

    page.evaluate(r'''() => {
      window.__startHelperLoadGate();
      const file = new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'fonte-antiga.pdf', {type: 'application/pdf'});
      window.__pendingHelperIngest = CentralPDFApp.openFilesInTool([file], 'merge');
    }''')
    page.wait_for_function("window.__helperLoadStarted === true")
    page.evaluate(r'''async () => {
      CentralPDFApp.selectTool('split');
      window.__releaseHelperLoad();
      await window.__pendingHelperIngest;
    }''')
    assert page.evaluate("CentralPDFApp.getActiveTool()") == 'split'
    assert page.evaluate("CentralPDFApp.getFiles().length") == 0
    assert page.locator('#pageGrid .page-card').count() == 0
    assert page.locator('#pageCountLabel').inner_text() == '0 páginas'
    assert page.locator('#statusBox').inner_text() == 'Adicione um arquivo para continuar.'

    page.evaluate(r'''() => {
      window.__startHelperLoadGate();
      const file = new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'divisao-antiga.pdf', {type: 'application/pdf'});
      window.__pendingHelperIngest = CentralPDFApp.openFilesInTool([file], 'split');
    }''')
    page.wait_for_function("window.__helperLoadStarted === true")
    page.evaluate(r'''async () => {
      CentralPDFApp.selectTool('organize');
      CentralPDFApp.selectTool('split');
      window.__releaseHelperLoad();
      await window.__pendingHelperIngest;
    }''')
    assert page.evaluate("CentralPDFApp.getActiveTool()") == 'split'
    assert page.evaluate("CentralPDFApp.getFiles().length") == 0
    assert 'Adicione um PDF' in page.locator('#splitDocumentInfo').inner_text()
    assert page.locator('#splitPlanCount').inner_text() == '0 arquivos'
    assert page.locator('#processButton').is_disabled()

    page.evaluate(r'''async () => {
      window.__mockPageCount = 180;
      window.__previewObservers = [];
      window.IntersectionObserver = class {
        constructor(callback) {
          this.callback = callback;
          this.targets = [];
          window.__previewObservers.push(this);
        }
        observe(target) { this.targets.push(target); }
        unobserve(target) { this.targets = this.targets.filter(item => item !== target); }
        disconnect() { this.targets = []; }
      };
      window.__triggerLatestPreview = () => {
        const observer = window.__previewObservers.at(-1);
        const target = observer?.targets[0];
        if (!target) throw new Error('Nenhuma miniatura pendente.');
        observer.callback([{isIntersecting: true, target}]);
      };
      const bytes = new Uint8Array([37,80,68,70,45,49,46,55,1]);
      const file = new File([bytes], 'organizador-lento.pdf', {type: 'application/pdf'});
      const originalArrayBuffer = file.arrayBuffer.bind(file);
      file.arrayBuffer = async () => {
        const data = await originalArrayBuffer();
        if (window.__gateLazyPreview) {
          window.__lazyPreviewStarted = true;
          await window.__lazyPreviewGate;
          window.__lazyPreviewReleased = true;
        }
        return data;
      };
      await CentralPDFApp.openFilesInTool([file], 'organize');
      window.__pdfLoads = [];
      window.__pdfRenders = [];
      window.pdfjsLib = {
        GlobalWorkerOptions: {workerSrc: 'mock-worker'},
        getDocument: ({data}) => {
          const marker = data[data.length - 1];
          window.__pdfLoads.push(marker);
          return {promise: Promise.resolve({
            getPage: async () => ({
              getViewport: ({scale}) => ({width: 100 * scale, height: 100 * scale}),
              render: () => ({promise: Promise.resolve().then(() => window.__pdfRenders.push(marker))}),
            }),
            destroy: async () => {},
          })};
        },
      };
      window.__lazyPreviewStarted = false;
      window.__lazyPreviewReleased = false;
      window.__lazyPreviewGate = new Promise(resolve => { window.__releaseLazyPreview = resolve; });
      window.__gateLazyPreview = true;
      window.__triggerLatestPreview();
    }''')
    page.wait_for_function("window.__lazyPreviewStarted === true")
    page.evaluate(r'''async () => {
      window.__gateLazyPreview = false;
      const bytes = new Uint8Array([37,80,68,70,45,49,46,55,2]);
      await CentralPDFApp.openFilesInTool([new File([bytes], 'organizador-novo.pdf', {type: 'application/pdf'})], 'organize');
    }''')
    page.evaluate("window.__releaseLazyPreview()")
    page.wait_for_function("window.__lazyPreviewReleased === true")
    page.evaluate("window.__triggerLatestPreview()")
    page.wait_for_function("window.__pdfLoads.includes(2)")
    page.wait_for_function("window.__pdfRenders.length > 0")
    assert 1 not in page.evaluate("window.__pdfLoads"), page.evaluate("window.__pdfLoads")
    assert page.evaluate("window.__pdfRenders.at(-1)") == 2

    page.evaluate(r'''() => {
      window.__startHelperLoadGate();
      const file = new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'divisao-removida.pdf', {type: 'application/pdf'});
      window.__pendingHelperIngest = CentralPDFApp.openFilesInTool([file], 'split');
    }''')
    page.wait_for_function("window.__helperLoadStarted === true")
    page.locator('.file-card-remove').click()
    page.evaluate(r'''async () => {
      window.__releaseHelperLoad();
      await window.__pendingHelperIngest;
    }''')
    assert page.evaluate("CentralPDFApp.getFiles().length") == 0
    assert 'Adicione um PDF' in page.locator('#splitDocumentInfo').inner_text()
    assert page.locator('#splitPlanCount').inner_text() == '0 arquivos'
    assert page.locator('#processButton').is_disabled()
    assert not errors, errors
    browser.close()

print('pdf-ingest-browser: passed')
