"""Serve the real npm PDF engines when an unprepared checkout has no vendor copy.

CI's test job installs app/node_modules; the Pages job separately validates the
prepared distribution. No PDF API or conversion output is mocked here.
"""
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

class LocalEngineHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/vendor/offline-status.js':
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.end_headers()
            self.wfile.write(b'window.CentralPDFOfflineStatus={prepared:false,pdfLib:true,pdfJs:true,pdfWorker:true,ocr:false,conversions:false};')
            return
        if not (Path(self.directory) / path.lstrip('/')).is_file():
            if path == '/vendor/pdf-lib.min.js':
                self.path = '/app/node_modules/pdf-lib/dist/pdf-lib.min.js'
            elif path.startswith('/vendor/pdfjs/'):
                relative = path.removeprefix('/vendor/pdfjs/')
                relative = {'pdf.min.mjs':'legacy/build/pdf.mjs',
                            'pdf.worker.min.mjs':'legacy/build/pdf.worker.mjs'}.get(relative, relative)
                self.path = '/app/node_modules/pdfjs-dist/' + relative
        super().do_GET()
