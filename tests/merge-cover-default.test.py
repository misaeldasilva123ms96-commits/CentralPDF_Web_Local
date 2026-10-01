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
           'assets/js/pdf-native-text.js', 'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
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
        page.evaluate('''async ()=>{
          const files=[];
          for(const [name,count] of [['A.pdf',2],['B.pdf',3]]) {
            const doc=await PDFLib.PDFDocument.create();for(let i=0;i<count;i++)doc.addPage().drawText(name+' pagina '+(i+1));
            files.push(new File([await doc.save()],name,{type:'application/pdf'}));
          }
          await CentralPDFApp.openFilesInTool(files,'merge');
        }''')
        assert page.locator('#mergePageView').input_value()=='covers'
        assert page.locator('#pageGrid .page-card').count()==2
        assert page.locator('#pageCountLabel').inner_text()=='2 capas'
        assert page.locator('#mergePlanCount').inner_text()=='2 capas'
        assert page.locator('#pageGrid .page-position').all_text_contents()==['1','2']
        page.locator('#pageGrid .page-select input').first.check()
        assert page.locator('#selectedPagesCount').inner_text()=='1 capa selecionada'
        page.locator('#selectAllPages').click()
        assert page.locator('#selectedPagesCount').inner_text()=='2 capas selecionadas'
        page.locator('#selectAllPages').click()
        page.locator('#mergePageView').select_option('pages')
        assert page.locator('#pageGrid .page-card').count()==5
        assert page.locator('#pageCountLabel').inner_text()=='5 páginas'
        page.locator('#mergePageView').select_option('covers')
        assert page.locator('#pageGrid .page-position').all_text_contents()==['1','2']
        # Capture the actual downloaded PDF; the view must not filter output pages.
        with page.expect_download() as event:
            page.locator('#processButton').click()
        data=list(Path(event.value.path()).read_bytes())
        result=page.evaluate('''async bytes=>{
          const task=pdfjsLib.getDocument({data:Uint8Array.from(bytes)}),doc=await task.promise;
          const text=[];for(let i=1;i<=doc.numPages;i++)text.push((await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(' '));
          await task.destroy();return text;
        }''',data)
        assert result==['A.pdf pagina 1','A.pdf pagina 2','B.pdf pagina 1','B.pdf pagina 2','B.pdf pagina 3'],result
        assert not errors,errors
        browser.close()
        print('merge-cover-default: cover counts, selection, sequential labels, switch and complete real PDF export passed')
finally:
    server.shutdown()
