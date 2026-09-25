"""Regression coverage for the failures reported in the persisted app logs."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import re

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', '', html)
scripts = ['app/node_modules/pdf-lib/dist/pdf-lib.min.js', 'vendor/jszip.min.js',
           'assets/js/pdf-ingest.js', 'assets/js/split-planner.js',
           'assets/js/advanced-planner.js', 'assets/js/organizer-planner.js',
           'assets/js/pdf-editor.js', 'assets/js/ux-enhancements.js',
           'assets/js/forms-signatures-0.18.js', 'assets/js/app.js',
           'assets/js/foundation.js', 'assets/js/stable-1.0.js']
mock = """
window.CentralPDFPdfWorkerReady = Promise.resolve();
window.pdfjsLib = {
  GlobalWorkerOptions: {workerSrc: 'test-worker'},
  getDocument() { return {destroy: async () => {}, promise: Promise.resolve({
    numPages: 3, destroy: async () => {},
    getPage: async number => ({
      getViewport: ({scale}) => ({width: 420 * scale, height: 595 * scale}),
      render: () => ({promise: (async () => {
        if (window.__pauseSecond && number === 2) {
          window.__renderPaused = true;
          await new Promise(resolve => { window.__resumeRender = resolve; });
        }
      })()})
    })
  })}; }
};
window.__makePdf = async name => {
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 3; i++) doc.addPage([420,595]);
  return new File([await doc.save()], name, {type: 'application/pdf'});
};
window.__recovery = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('centralpdf-foundation', 1);
  request.onsuccess = () => {
    const db = request.result;
    const read = db.transaction('recovery').objectStore('recovery').get('latest');
    read.onsuccess = () => { db.close(); resolve(read.result); };
    read.onerror = () => reject(read.error);
  };
});
"""
html = html.replace('</body>', '<script>' + mock + '</script>' + ''.join(
    f'<script>{(root / path).read_text()}</script>' for path in scripts) + '</body>')


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test':
            data = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        options = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'):
            options['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
        browser = p.chromium.launch(**options)
        page = browser.new_page(viewport={'width': 1366, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/test')
        page.wait_for_function('window.CentralPDFApp && window.CentralPDFStable')
        assert 'Central' in page.title()
        assert page.locator('body').inner_text().strip()

        # Real pointer events: selection must not detach the gesture target.
        page.evaluate("""async () => {
          await CentralPDFApp.openFilesInTool([await __makePdf('form.pdf')], 'formBuilder');
          await CentralPDFForms.restoreProjectState({fields: [{id:'f1', page:1,
            x:.15,y:.15,w:.3,h:.1,type:'text',name:'nome',label:'Nome'}]});
        }""")
        field = page.locator('#formBuilderOverlay [data-id="f1"]')
        field.scroll_into_view_if_needed()
        box = field.bounding_box()
        page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
        page.mouse.down()
        page.mouse.move(box['x'] + box['width']/2 + 40, box['y'] + box['height']/2 + 30, steps=5)
        page.mouse.up()
        assert page.evaluate('CentralPDFForms.getFields()[0].x') > .18
        handle = page.locator('#formBuilderOverlay [data-handle="se"]')
        # Dragging can move the resize handle below the viewport. Mouse
        # coordinates do not auto-scroll like locator actions do.
        handle.hover()
        box = handle.bounding_box()
        assert handle.evaluate("el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; }")
        page.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
        page.mouse.down()
        page.mouse.move(box['x']+35, box['y']+25, steps=4)
        page.mouse.up()
        assert page.evaluate('CentralPDFForms.getFields()[0].w') > .32

        page.evaluate("""async () => {
          await CentralPDFApp.openFilesInTool([await __makePdf('assinatura.pdf')], 'signPdf');
          const canvas = document.createElement('canvas'); canvas.width=100; canvas.height=30;
          await CentralPDFSignatures.restoreProjectState({items:[{id:'s1',page:1,
            x:.15,y:.15,w:.3,h:.1,dataUrl:canvas.toDataURL(),rotation:0}]});
        }""")
        signature = page.locator('#signatureOverlay [data-id="s1"]')
        signature.scroll_into_view_if_needed()
        box = signature.bounding_box()
        page.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
        page.mouse.down()
        page.mouse.move(box['x']+box['width']/2+40, box['y']+box['height']/2+30, steps=4)
        page.mouse.up()
        assert page.evaluate('CentralPDFSignatures.getItems()[0].x') > .18
        # A synthetic/inactive pointer must not create an uncaught exception.
        signature.dispatch_event('pointerdown', {'pointerId':999,'clientX':0,'clientY':0})

        # Pause rendering, mutate the page list, then release the old task.
        page.evaluate("""async () => {
          const file = await __makePdf('race.pdf');
          window.__pauseSecond = true;
          window.__pending = CentralPDFApp.openFilesInTool([file], 'organize');
        }""")
        page.wait_for_function('window.__renderPaused')
        page.locator('#pageGrid .page-card .delete').first.click()
        page.evaluate('window.__pauseSecond = false; window.__resumeRender()')
        page.evaluate('window.__pending')
        assert page.locator('#pageGrid .page-card').count() == 2
        assert page.locator('#pageGrid .page-card').evaluate_all('(cards) => new Set(cards.map(c=>c.dataset.pageId)).size') == 2

        # Explicit guidance + source metadata for a zero-byte selection.
        page.evaluate("""() => {
          CentralPDFApp.selectTool('merge');
          const data = new DataTransfer(); data.items.add(new File([], 'zero.pdf'));
          const input = document.querySelector('#fileInput'); input.files = data.files;
          input.dispatchEvent(new Event('change', {bubbles:true}));
        }""")
        page.wait_for_function("document.querySelector('#statusBox').textContent.includes('0 bytes')")
        assert page.evaluate("CentralPDFStable.getErrors().some(x=>x.source.includes('origem: picker') && x.source.includes('bytes: 0'))")

        # Auto-recovery persists a readable project, and preserves it on I/O failure.
        page.evaluate("""async () => {
          window.__source = await __makePdf('recuperar.pdf');
          await CentralPDFApp.openFilesInTool([__source], 'split');
        }""")
        page.wait_for_function("document.querySelector('#foundationRecoverySlot .foundation-recovery-card')", timeout=15000)
        saved = page.evaluate('async () => (await __recovery()).savedAt')
        page.evaluate("""() => {
          __source.arrayBuffer = async () => { throw new DOMException('missing', 'NotFoundError'); };
          document.querySelector('#outputFileName').value = 'alterado';
          CentralPDFFoundation.scheduleRecovery();
        }""")
        page.wait_for_function("document.querySelector('#foundationRecoverySlot').textContent.includes('Não foi possível ler recuperar.pdf')", timeout=15000)
        assert page.evaluate('async () => (await __recovery()).savedAt') == saved
        page.evaluate("""async () => {
          delete __source.arrayBuffer;
          CentralPDFFoundation.scheduleRecovery();
        }""")
        page.wait_for_function("!document.querySelector('#foundationRecoverySlot').textContent.includes('não atualizada')", timeout=15000)
        assert page.evaluate('async () => (await __recovery()).savedAt') > saved
        assert 'não atualizada' not in page.locator('#foundationRecoverySlot').inner_text()
        assert page.evaluate("""async () => {
          const zip = await JSZip.loadAsync((await __recovery()).blob);
          const manifest = JSON.parse(await zip.file('project.json').async('string'));
          const bytes = await zip.file(manifest.files[0].path).async('uint8array');
          return (await PDFLib.PDFDocument.load(bytes)).getPageCount();
        }""") == 3

        # A change made during a save must trigger another save afterwards.
        page.evaluate("""() => {
          const read = __source.arrayBuffer.bind(__source);
          __source.arrayBuffer = async () => {
            window.__savingPaused = true;
            await new Promise(resolve => { window.__resumeSave = resolve; });
            return read();
          };
          document.querySelector('#outputFileName').value = 'primeiro';
          CentralPDFFoundation.scheduleRecovery();
        }""")
        page.wait_for_function('window.__savingPaused', timeout=15000)
        page.evaluate("""() => {
          document.querySelector('#outputFileName').value = 'segundo';
          CentralPDFFoundation.scheduleRecovery();
          delete __source.arrayBuffer;
          window.__resumeSave();
        }""")
        # Poll via a DOM flag, as wait_for_function is not an IndexedDB transaction.
        page.evaluate("""() => {
          const timer = setInterval(async () => {
            if ((await __recovery())?.summary.outputName === 'segundo') {
              window.__latestSaved = true; clearInterval(timer);
            }
          }, 100);
        }""")
        page.wait_for_function('window.__latestSaved', timeout=15000)

        # Known warnings stay in history and gain a readable explanation.
        page.evaluate("CentralPDFStable.addLog('aviso','Cannot load system font: Example','console.warn')")
        assert 'Compatibilidade de fonte' in page.locator('#cp10ErrorList').inner_text()
        assert page.evaluate("CentralPDFStable.getErrors().some(x=>x.message === 'Cannot load system font: Example')")
        assert not errors, errors
        if os.environ.get('RELIABILITY_SCREENSHOT'):
            page.keyboard.press('Alt+q')
            page.locator('#cp10ErrorList').scroll_into_view_if_needed()
            page.screenshot(path=os.environ['RELIABILITY_SCREENSHOT'])
            page.set_viewport_size({'width':390,'height':844})
            page.locator('#cp10ErrorList').scroll_into_view_if_needed()
            page.screenshot(path=os.environ['RELIABILITY_SCREENSHOT'].replace('.png','-mobile.png'))
        browser.close()
        print('runtime-reliability: pointer drag/resize, stale preview, empty files, recovery and logs passed')
finally:
    server.shutdown()
    server.server_close()
