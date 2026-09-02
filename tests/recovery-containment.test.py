from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PDF_LIB_BUNDLE = ROOT / "app" / "node_modules" / "pdf-lib" / "dist" / "pdf-lib.min.js"


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/vendor/offline-status.js":
            payload = (
                "window.CentralPDFOfflineStatus=Object.freeze({prepared:true,"
                "pdfLib:true,pdfJs:true,pdfWorker:true,libPdf:true,ocr:false,"
                "conversions:false});"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if path == "/vendor/pdf-lib.min.js":
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
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(
            f"http://127.0.0.1:{server.server_port}/?regression=recovery-containment",
            wait_until="domcontentloaded",
        )
        page.wait_for_function("window.CentralPDFApp && window.PDFLib")

        results = page.evaluate(
            """async () => {
              const unhandled = [];
              const onUnhandled = event => {
                unhandled.push(event.reason?.message || String(event.reason || 'unknown'));
              };
              window.addEventListener('unhandledrejection', onUnhandled);

              const buildFixtures = async () => {
                const source = await PDFLib.PDFDocument.create();
                source.addPage([420, 595]);
                const sourceBytes = await source.save();
                const {PDF} = await import('/vendor/libpdf-core.mjs');
                const encrypted = await PDF.load(new Uint8Array(sourceBytes));
                encrypted.setProtection({
                  userPassword: 'senha-conhecida-do-teste',
                  algorithm: 'AES-256',
                  permissions: {print: true, accessibility: true},
                });
                return {
                  corrupted: sourceBytes.slice(0, sourceBytes.length - 32),
                  encrypted: await encrypted.save(),
                };
              };
              const run = async ({bytes, name, tool, passwordSelector, password}) => {
                const outputs = [];
                const listener = event => outputs.push(event.detail.blob);
                window.addEventListener('centralpdf-result', listener);
                const originalClick = HTMLAnchorElement.prototype.click;
                HTMLAnchorElement.prototype.click = function () {};
                try {
                  const source = new File([bytes], name, {type: 'application/pdf'});
                  await CentralPDFApp.openFilesInTool([source], tool);
                  const fileCount = CentralPDFApp.getFiles().length;
                  const ingestStatus = document.querySelector('#statusBox')?.innerText || '';
                  if (tool === 'diagnose') document.querySelector('#diagnoseJson').checked = false;
                  if (passwordSelector) document.querySelector(passwordSelector).value = password;
                  const outcome = fileCount ? await CentralPDFApp.processCurrentTool() : null;
                  await Promise.resolve();
                  const renderedOutputs = [];
                  for (const blob of outputs) {
                    renderedOutputs.push({
                      size: blob.size,
                      type: blob.type,
                      text: blob.type.startsWith('text/') ? await blob.text() : '',
                    });
                  }
                  return {
                    fileCount,
                    ingestStatus,
                    ok: outcome?.ok ?? null,
                    error: outcome?.error?.message || '',
                    status: document.querySelector('#statusBox')?.innerText || '',
                    outputs: renderedOutputs,
                  };
                } finally {
                  HTMLAnchorElement.prototype.click = originalClick;
                  window.removeEventListener('centralpdf-result', listener);
                }
              };

              try {
                const fixtures = await buildFixtures();
                return {
                  corruptedDiagnose: await run({
                    bytes: fixtures.corrupted, name: 'corrompido.pdf', tool: 'diagnose'
                  }),
                  corruptedUnlock: await run({
                    bytes: fixtures.corrupted, name: 'corrompido.pdf', tool: 'unlock'
                  }),
                  encryptedUnlockEmpty: await run({
                    bytes: fixtures.encrypted, name: 'criptografado.pdf', tool: 'unlock',
                    passwordSelector: '#unlockPassword', password: ''
                  }),
                  encryptedUnlockInvalid: await run({
                    bytes: fixtures.encrypted, name: 'criptografado.pdf', tool: 'unlock',
                    passwordSelector: '#unlockPassword', password: 'senha-deliberadamente-incorreta'
                  }),
                  encryptedDiagnose: await run({
                    bytes: fixtures.encrypted, name: 'criptografado.pdf', tool: 'diagnose'
                  }),
                  encryptedRepair: await run({
                    bytes: fixtures.encrypted, name: 'criptografado.pdf', tool: 'repairAdvanced'
                  }),
                  unhandled,
                };
              } finally {
                window.removeEventListener('unhandledrejection', onUnhandled);
              }
            }"""
        )

        corrupted_diagnose = results["corruptedDiagnose"]
        assert corrupted_diagnose["fileCount"] == 1, corrupted_diagnose
        assert corrupted_diagnose["ok"] is True, corrupted_diagnose
        assert len(corrupted_diagnose["outputs"]) == 1, corrupted_diagnose
        assert corrupted_diagnose["outputs"][0]["type"].startswith("text/plain"), corrupted_diagnose
        assert corrupted_diagnose["outputs"][0]["size"] > 0, corrupted_diagnose
        assert "corrompido.pdf" in corrupted_diagnose["outputs"][0]["text"], corrupted_diagnose

        corrupted_unlock = results["corruptedUnlock"]
        assert corrupted_unlock["fileCount"] == 0, corrupted_unlock
        assert corrupted_unlock["ok"] is None, corrupted_unlock
        assert corrupted_unlock["outputs"] == [], corrupted_unlock
        assert "corrompido.pdf" in corrupted_unlock["ingestStatus"], corrupted_unlock

        encrypted_unlock_empty = results["encryptedUnlockEmpty"]
        assert encrypted_unlock_empty["fileCount"] == 1, encrypted_unlock_empty
        assert encrypted_unlock_empty["ok"] is False, encrypted_unlock_empty
        assert encrypted_unlock_empty["outputs"] == [], encrypted_unlock_empty
        assert "Informe a senha" in encrypted_unlock_empty["error"], encrypted_unlock_empty

        encrypted_unlock_invalid = results["encryptedUnlockInvalid"]
        assert encrypted_unlock_invalid["fileCount"] == 1, encrypted_unlock_invalid
        assert encrypted_unlock_invalid["ok"] is False, encrypted_unlock_invalid
        assert encrypted_unlock_invalid["outputs"] == [], encrypted_unlock_invalid
        assert encrypted_unlock_invalid["error"], encrypted_unlock_invalid

        encrypted_diagnose = results["encryptedDiagnose"]
        assert encrypted_diagnose["fileCount"] == 1, encrypted_diagnose
        assert encrypted_diagnose["ok"] is True, encrypted_diagnose
        assert len(encrypted_diagnose["outputs"]) == 1, encrypted_diagnose
        assert encrypted_diagnose["outputs"][0]["type"].startswith("text/plain"), encrypted_diagnose
        assert encrypted_diagnose["outputs"][0]["size"] > 0, encrypted_diagnose
        assert "criptografado.pdf" in encrypted_diagnose["outputs"][0]["text"], encrypted_diagnose

        encrypted_repair = results["encryptedRepair"]
        assert encrypted_repair["fileCount"] == 1, encrypted_repair
        assert encrypted_repair["ok"] is False, encrypted_repair
        assert encrypted_repair["outputs"] == [], encrypted_repair
        assert encrypted_repair["error"], encrypted_repair

        assert results["unhandled"] == [], results["unhandled"]
        assert page_errors == [], page_errors
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)

print("recovery-containment: passed")
