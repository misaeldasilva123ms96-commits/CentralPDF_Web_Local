"""Exercise mode changes against real PDF rendering and export, including history."""
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
           'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
           'assets/js/ux-enhancements.js', 'assets/js/app.js',
           'assets/js/layout-controls.js', 'assets/js/foundation.js', 'assets/js/experience-0.15.js',
           'assets/js/stable-1.0.js', 'assets/js/header-settings-1.0.3.js',
           'assets/js/product-redesign-2.0.js']
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
try:
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/test')
        page.wait_for_function('window.testReady')
        page.wait_for_selector('#cp101SettingsButton')
        assert 'Central PDF' in page.title()
        page.locator('[data-tool="editPdf"].tool-card').click()
        page.evaluate('''async () => {
          const doc = await PDFLib.PDFDocument.create();
          doc.addPage([420, 595]).drawText('Documento original', {x: 30, y: 540, size: 18});
          doc.addPage([420, 595]);
          await CentralPDFApp.openFilesInTool([new File([await doc.save()], 'modos.pdf', {type: 'application/pdf'})], 'editPdf');
        }''')
        simple = page.locator('[data-editor-mode="simple"]')
        advanced = page.locator('[data-editor-mode="advanced"]')
        assert simple.get_attribute('aria-pressed') == 'true'
        assert not page.locator('[data-editor-tool="cover"]').is_visible()
        page.locator('[data-editor-tool="text"]').click()
        stage = page.locator('#editorStage').bounding_box()
        page.mouse.click(stage['x'] + 100, stage['y'] + 160)
        page.wait_for_selector('.editor-object.selected')
        page.locator('#editorTextValue').fill('Revisado por Misael')
        before = page.evaluate('PDFVisualEditor.exportProjectState().pages')
        selected = page.evaluate('PDFVisualEditor.exportProjectState().selectedObjectId')
        assert not page.locator('#editorObjectSizePanel').is_visible()
        advanced.click()
        assert advanced.get_attribute('aria-pressed') == 'true'
        assert page.locator('#editorObjectSizePanel').is_visible()
        assert page.locator('#editorObjectsList').inner_text() == 'Texto: Revisado por Misael'
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages') == before
        assert page.evaluate('PDFVisualEditor.exportProjectState().selectedObjectId') == selected
        page.locator('#editorDuplicateObject').click()
        assert page.locator('.editor-object-list-item').count() == 2
        simple.click()
        page.locator('#editorUndo').click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().pages') == before
        advanced.click()
        page.locator('#editorRedo').click()
        assert page.locator('.editor-object-list-item').count() == 2
        page.locator('.editor-object-list-item').last.click()
        assert page.evaluate('PDFVisualEditor.exportProjectState().selectedObjectId') == selected
        page.locator('#editorDeleteObject').click()
        assert page.locator('.editor-object-list-item').count() == 1
        page.locator('[data-editor-tool="cover"]').click()
        simple.click()
        assert page.locator('[data-editor-tool="select"]').get_attribute('class').endswith('active')
        page.locator('#editorTogglePages').click()
        assert not page.locator('#editorPageSidebar').is_visible()
        page.locator('#editorTogglePages').click()
        assert page.locator('#editorPageSidebar').is_visible()
        result = page.evaluate('''async () => {
          const {bytes} = await PDFVisualEditor.exportPdf();
          const task = pdfjsLib.getDocument({data: bytes});
          const doc = await task.promise;
          const text = await (await doc.getPage(1)).getTextContent();
          const result = {pages: doc.numPages, text: text.items.map(item => item.str).join(' ')};
          await task.destroy();
          return result;
        }''')
        assert result['pages'] == 2
        assert 'Documento original' in result['text']
        assert 'Revisado por Misael' in result['text']
        assert page.locator('#processButton').is_enabled()
        page.locator('[data-editor-mode="advanced"]').click()
        page.locator('.editor-object-list-item').first.click()
        page.evaluate("document.body.dataset.theme = 'dark'")
        for width, height in [(1440, 1000), (390, 844)]:
            page.set_viewport_size({'width': width, 'height': height})
            for mode in ['simple', 'advanced']:
                page.locator(f'[data-editor-mode="{mode}"]').click()
                assert page.locator('#editorModeDescription').is_visible()
                if os.environ.get('QA_SCREENSHOT_DIR'):
                    page.screenshot(path=str(Path(os.environ['QA_SCREENSHOT_DIR']) / f'editor-{mode}-{width}.png'))
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors, errors
        browser.close()
        print('editor-modes: real PDF, selection, undo/redo, object list, export and responsive layout passed')
finally:
    server.shutdown()
