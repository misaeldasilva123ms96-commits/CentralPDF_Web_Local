from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PDF_LIB_BUNDLE = ROOT / "app" / "node_modules" / "pdf-lib" / "dist" / "pdf-lib.min.js"


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] == "/vendor/offline-status.js":
            payload = (
                "window.CentralPDFOfflineStatus=Object.freeze({prepared:false,"
                "pdfLib:true,pdfJs:false,pdfWorker:false,libPdf:false,ocr:false,"
                "conversions:false});"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path.split("?", 1)[0] == "/vendor/pdf-lib.min.js":
            payload = PDF_LIB_BUNDLE.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def log_message(self, _format, *_args):
        pass


assert PDF_LIB_BUNDLE.is_file(), (
    "Motor pdf-lib de teste ausente; execute `npm ci --prefix app --ignore-scripts`."
)

handler = partial(QuietHandler, directory=str(ROOT))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        page = browser.new_page()
        page.goto(
            f"http://127.0.0.1:{server.server_port}/?regression=forms-recovery",
            wait_until="domcontentloaded",
        )
        page.wait_for_function("window.CentralPDFApp && window.PDFLib")

        form_result = page.evaluate(
            """async () => {
              const pdf = await PDFLib.PDFDocument.create();
              pdf.addPage([420, 595]);
              const sourceBytes = await pdf.save();
              const source = new File([sourceBytes], 'formulario-real.pdf', {type: 'application/pdf'});
              const outputs = [];
              const listener = event => outputs.push(event.detail.blob);
              window.addEventListener('centralpdf-result', listener);
              const originalClick = HTMLAnchorElement.prototype.click;
              HTMLAnchorElement.prototype.click = function () {};
              try {
                await CentralPDFApp.openFilesInTool([source], 'formBuilder');
                await CentralPDFForms.restoreProjectState({
                  page: 1,
                  seq: 1,
                  fields: [{
                    id: 'f1', page: 1, x: .12, y: .55, w: .45, h: .07,
                    type: 'text', name: 'nome_completo', label: 'Nome completo',
                    defaultValue: 'Teste Central PDF', options: [], fontSize: 11,
                    maxLength: 80, textColor: '#111827', borderColor: '#7c6cff',
                    background: '#ffffff', required: true
                  }]
                });
                const run = await CentralPDFApp.processCurrentTool();
                if (!run.ok || outputs.length !== 1) {
                  return {ok: false, error: run.error?.message || 'saída não gerada'};
                }
                const generated = await PDFLib.PDFDocument.load(await outputs[0].arrayBuffer());
                return {
                  ok: true,
                  pages: generated.getPageCount(),
                  fields: generated.getForm().getFields().map(field => field.getName()),
                  text: generated.getForm().getTextField('nome_completo').getText()
                };
              } finally {
                HTMLAnchorElement.prototype.click = originalClick;
                window.removeEventListener('centralpdf-result', listener);
              }
            }"""
        )
        assert form_result == {
            "ok": True,
            "pages": 1,
            "fields": ["nome_completo"],
            "text": "Teste Central PDF",
        }, form_result

        repair_result = page.evaluate(
            """async () => {
              const pdf = await PDFLib.PDFDocument.create();
              const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
              for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
                const page = pdf.addPage([420, 595]);
                page.drawText(`Página real ${pageNumber}`, {x: 40, y: 530, size: 18, font});
              }
              const sourceBytes = await pdf.save();
              const truncated = sourceBytes.slice(0, sourceBytes.length - 32);
              const source = new File([truncated], 'documento-truncado.pdf', {type: 'application/pdf'});
              const outputs = [];
              const listener = event => outputs.push(event.detail.blob);
              window.addEventListener('centralpdf-result', listener);
              const originalClick = HTMLAnchorElement.prototype.click;
              HTMLAnchorElement.prototype.click = function () {};
              try {
                await CentralPDFApp.openFilesInTool([source], 'repairAdvanced');
                const run = await CentralPDFApp.processCurrentTool();
                return {
                  ok: run.ok,
                  outputs: outputs.length,
                  error: run.error?.message || ''
                };
              } finally {
                HTMLAnchorElement.prototype.click = originalClick;
                window.removeEventListener('centralpdf-result', listener);
              }
            }"""
        )
        assert repair_result["ok"] is False, repair_result
        assert repair_result["outputs"] == 0, repair_result
        assert "não produziu um PDF válido" in repair_result["error"], repair_result

        valid_repair_result = page.evaluate(
            """async () => {
              const pdf = await PDFLib.PDFDocument.create();
              pdf.addPage([420, 595]);
              const source = new File([await pdf.save()], 'documento-valido.pdf', {type: 'application/pdf'});
              const outputs = [];
              const listener = event => outputs.push(event.detail.blob);
              window.addEventListener('centralpdf-result', listener);
              const originalClick = HTMLAnchorElement.prototype.click;
              HTMLAnchorElement.prototype.click = function () {};
              try {
                await CentralPDFApp.openFilesInTool([source], 'repairAdvanced');
                const run = await CentralPDFApp.processCurrentTool();
                const generated = outputs[0]
                  ? await PDFLib.PDFDocument.load(await outputs[0].arrayBuffer())
                  : null;
                return {
                  ok: run.ok,
                  outputs: outputs.length,
                  pages: generated?.getPageCount() || 0,
                  error: run.error?.message || ''
                };
              } finally {
                HTMLAnchorElement.prototype.click = originalClick;
                window.removeEventListener('centralpdf-result', listener);
              }
            }"""
        )
        assert valid_repair_result == {
            "ok": True,
            "outputs": 1,
            "pages": 1,
            "error": "",
        }, valid_repair_result

        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("forms-recovery-real-pdf: passed")
