"""Regression coverage for editor failure recovery and preview resource lifetime."""
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
scripts = ['app/node_modules/pdf-lib/dist/pdf-lib.min.js',
           'assets/js/pdf-ingest.js',
           'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
           'assets/js/pdf-native-text.js', 'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
           'assets/js/ux-enhancements.js', 'assets/js/app.js',
           'assets/js/layout-controls.js', 'assets/js/foundation.js', 'assets/js/experience-0.15.js',
           'assets/js/stable-1.0.js', 'assets/js/header-settings-1.0.3.js',
           'assets/js/product-redesign-2.0.js', 'assets/js/workspace-modernization.js']
html = html.replace('</body>', ''.join(f'<script src="/{name}"></script>' for name in scripts) + '''
<script type="module">
  import * as pdfjs from '/app/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
  window.pdfjsLib = pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = '/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
  window.testReady = true;
</script></body>''')


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
import unittest


class EditorStabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(f'http://127.0.0.1:{server.server_port}/test')
        self.page.wait_for_function('window.testReady')
        self.page.evaluate("""async () => {
          async function pdf(label, count) {
            const doc = await PDFLib.PDFDocument.create();
            for (let n = 1; n <= count; n++) {
              const p = doc.addPage([420, 595]);
              p.drawText(`${label} ${n}`, {x: 30, y: 540, size: 14});
            }
            return await doc.save();
          }
          window.stabilityFiles = {
            original: new File([await pdf('Original', 3)], 'João  revisão.pdf', {type: 'application/pdf'}),
            replacement: new File([await pdf('Substituta', 2)], 'Páginas de reposição.pdf', {type: 'application/pdf'})
          };
          await CentralPDFApp.openFilesInTool([stabilityFiles.original], 'editPdf');
        }""")
        self.page.locator('[data-editor-mode="advanced"]').click()
        self.original = self.page.evaluate('PDFVisualEditor.exportProjectState().pages')

    def tearDown(self):
        self.page.close()
        assert not self.errors, self.errors

    def replacement(self):
        self.page.locator('#editorReplacePage').click()
        self.page.evaluate("""() => {
          const dt = new DataTransfer(); dt.items.add(stabilityFiles.replacement);
          const input = document.querySelector('#editorReplacementInput');
          input.files = dt.files; input.dispatchEvent(new Event('change', {bubbles: true}));
        }""")
        self.page.wait_for_function("!document.querySelector('#editorReplacementApply').disabled")

    def assert_preview_empty(self):
        assert self.page.locator('#editorReplacementPreview').evaluate(
            'canvas => canvas.width === 0 && canvas.height === 0'), 'A prévia anterior continuou visível'

    def test_invalid_replacement_clears_previous_preview(self):
        self.replacement()
        assert self.page.locator('#editorReplacementPreview').evaluate('canvas => canvas.width > 0')
        self.page.locator('#editorReplacementPage').fill('99')
        assert self.page.locator('#editorReplacementApply').is_disabled()
        self.assert_preview_empty()
        self.page.locator('#editorReplacementPage').fill('2')
        self.page.wait_for_function("!document.querySelector('#editorReplacementApply').disabled")
        self.page.locator('#editorReplacementInput').set_input_files(
            {'name': 'inválido.pdf', 'mimeType': 'application/pdf', 'buffer': b'broken'})
        self.page.wait_for_function("!document.querySelector('#editorReplacementStatus').textContent.includes('Lendo')")
        assert self.page.locator('#editorReplacementApply').is_disabled()
        assert self.page.locator('#editorReplacementPageField').is_hidden()
        self.assert_preview_empty()
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original
        self.page.locator('#editorReplaceClose').click()
        # Retry on mobile, Escape cancels and keyboard focus returns to the trigger.
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.replacement()
        assert self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        self.page.keyboard.press('Escape')
        assert self.page.locator('#editorReplaceDialog').is_hidden()
        assert self.page.locator('#editorReplacePage').evaluate('el => el === document.activeElement')
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original

    def test_failed_append_keeps_existing_document_exportable(self):
        # A real File succeeds at validation, then its second read fails at editor load.
        self.page.evaluate("""async () => {
          const file = stabilityFiles.replacement, read = file.arrayBuffer.bind(file);
          let reads = 0;
          file.arrayBuffer = async () => {
            if (++reads > 1) throw new Error('Falha de leitura simulada após a inspeção');
            return read();
          };
          await CentralPDFApp.addFiles([file], {source: 'drop'});
          file.arrayBuffer = read;
        }""")
        assert 'Falha de leitura' in self.page.locator('#statusBox').inner_text()
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original
        assert self.page.locator('#processButton').is_enabled(), 'A falha de anexação bloqueou o documento intacto'
        self.page.locator('#outputFileName').fill('João  revisão final')
        with self.page.expect_download() as download:
            self.page.locator('#processButton').click()
        assert download.value.suggested_filename == 'João  revisão final.pdf'
        saved = list(Path(download.value.path()).read_bytes())
        texts = self.page.evaluate("""async bytes => {
          const task = pdfjsLib.getDocument({data: new Uint8Array(bytes)}), doc = await task.promise, texts = [];
          try {
            for (let n = 1; n <= doc.numPages; n++)
              texts.push((await (await doc.getPage(n)).getTextContent()).items.map(item => item.str).join(''));
            return texts;
          } finally { await task.destroy(); }
        }""", saved)
        assert texts == ['Original 1', 'Original 2', 'Original 3']
        self.page.locator('#continueEditingButton').click()
        # The next append still succeeds, and undo returns to the original.
        self.page.evaluate("async () => await CentralPDFApp.addFiles([stabilityFiles.replacement], {source: 'drop'})")
        assert self.page.evaluate('PDFVisualEditor.getProjectSummary().pageCount') == 5
        self.page.locator('#editorUndo').click()
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original

    def test_failed_initial_load_stays_disabled(self):
        self.page.evaluate("""async () => {
          CentralPDFApp.selectTool('editPdf');
          const file = stabilityFiles.original, read = file.arrayBuffer.bind(file);
          let reads = 0;
          file.arrayBuffer = async () => {
            if (++reads > 1) throw new Error('Falha de leitura na abertura inicial');
            return read();
          };
          await CentralPDFApp.addFiles([file]);
        }""")
        assert 'Falha de leitura' in self.page.locator('#statusBox').inner_text()
        assert not self.page.evaluate('PDFVisualEditor.hasDocument()')
        assert self.page.locator('#processButton').is_disabled()

    def test_late_preview_cannot_replace_the_latest_selection(self):
        self.page.wait_for_function("document.querySelectorAll('#editorThumbnailList button[data-rendered=\"true\"]').length === 3")
        self.page.evaluate("""() => {
          const real = window.pdfjsLib;
          let delayOnce = true;
          window.pdfjsLib = {...real, getDocument(options) {
            const loadingTask = real.getDocument(options);
            const promise = loadingTask.promise.then(doc => {
              const getPage = doc.getPage.bind(doc);
              doc.getPage = async number => {
                const pdfPage = await getPage(number);
                if (number !== 1) return pdfPage;
                const render = pdfPage.render.bind(pdfPage);
                pdfPage.render = options => {
                  const task = render(options);
                  if (!delayOnce) return task;
                  delayOnce = false;
                  // A real render finishes, but notification is held until after
                  // the user selects page 2. Cancellation cannot revoke completion.
                  const promise = task.promise.then(() => new Promise(resolve => {
                    window.releaseLateRender = () => { resolve(); };
                    window.lateRenderWaiting = true;
                  }));
                  return {promise, cancel: () => task.cancel()};
                };
                return pdfPage;
              };
              return doc;
            });
            return {promise, destroy: () => loadingTask.destroy()};
          }};
          window.restorePreviewEngine = () => { window.pdfjsLib = real; };
        }""")
        self.page.locator('#editorReplacePage').click()
        self.page.evaluate("""() => {
          const dt = new DataTransfer(); dt.items.add(stabilityFiles.replacement);
          const input = document.querySelector('#editorReplacementInput');
          input.files = dt.files; input.dispatchEvent(new Event('change', {bubbles: true}));
        }""")
        self.page.wait_for_function('window.lateRenderWaiting')
        assert self.page.locator('#editorReplacementApply').is_disabled()
        self.page.locator('#editorReplacementPage').fill('2')
        self.page.wait_for_function("!document.querySelector('#editorReplacementApply').disabled")
        latest = self.page.locator('#editorReplacementPreview').evaluate('canvas => canvas.toDataURL()')
        self.page.evaluate('async () => { releaseLateRender(); await new Promise(resolve => setTimeout(resolve, 0)); }')
        assert self.page.locator('#editorReplacementPreview').evaluate('canvas => canvas.toDataURL()') == latest
        self.page.locator('#editorReplacementApply').click()
        self.page.evaluate('window.restorePreviewEngine()')
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages[0].sourceIndex') == 1
        text = self.page.evaluate("""async () => {
          const result = await PDFVisualEditor.exportPdf({silent: true});
          const task = pdfjsLib.getDocument({data: result.bytes});
          try { return (await (await (await task.promise).getPage(1)).getTextContent()).items.map(x => x.str).join(''); }
          finally { await task.destroy(); }
        }""")
        assert text == 'Substituta 2'
        self.page.locator('#editorUndo').click()
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original

    def test_failed_thumbnail_releases_temporary_pdf(self):
        # Only object thumbnails create an extra PDF document. Use the real worker,
        # then inject a page-fetch failure and observe its loading task disposal.
        self.page.wait_for_function("document.querySelectorAll('#editorThumbnailList button[data-rendered=\"true\"]').length === 3")
        self.page.evaluate("""() => {
          const real = window.pdfjsLib;
          window.thumbnailDestroyCount = 0;
          window.pdfjsLib = {...real, getDocument(options) {
            const task = real.getDocument(options), destroy = task.destroy.bind(task);
            task.destroy = () => { window.thumbnailDestroyCount++; return destroy(); };
            const promise = task.promise.then(doc => {
              doc.getPage = async () => { throw new Error('Falha simulada ao preparar a miniatura'); };
              return doc;
            });
            // Keep the real task and its worker behind a failing document facade.
            return {promise, destroy: task.destroy};
          }};
          window.restoreThumbnailEngine = () => { window.pdfjsLib = real; };
          const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 24;
          canvas.getContext('2d').fillRect(0, 0, 100, 24);
          window.signatureFile = new File([Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), c => c.charCodeAt(0))], 'Assinatura João.png', {type: 'image/png'});
        }""")
        self.page.evaluate('async () => await PDFVisualEditor.addImages([signatureFile])')
        self.page.wait_for_selector('#editorThumbnailList button[data-rendered="error"]')
        assert self.page.evaluate('window.thumbnailDestroyCount') == 1, 'Worker temporário não foi liberado após erro'
        self.page.evaluate('window.restoreThumbnailEngine()')
        self.page.locator('#editorUndo').click()
        self.page.locator('#editorRedo').click()
        self.page.wait_for_selector('#editorThumbnailList button[data-rendered="true"]')
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages[0].objects.length') == 1
        self.page.locator('#editorUndo').click()
        assert self.page.evaluate('PDFVisualEditor.exportProjectState().pages') == self.original


try:
    unittest.main(verbosity=2)
finally:
    server.shutdown()
    server.server_close()
