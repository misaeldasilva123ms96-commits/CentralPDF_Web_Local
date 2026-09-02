"""Real-browser runtime checks for CentralPDF Compatibility Gate 1.0."""

from __future__ import annotations

import base64
from collections import Counter
from contextlib import contextmanager
import json
from pathlib import Path
import shutil
import socket
import subprocess
import time
import urllib.request
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
CORPUS_ROOT = ROOT / "tests" / "pdf-corpus" / "cache"


def _mime(path: Path) -> str:
    if path.suffix == ".mjs":
        return "text/javascript"
    if path.suffix == ".wasm":
        return "application/wasm"
    return "application/octet-stream"


def _route_legacy_engines(route) -> None:
    path = unquote(urlparse(route.request.url).path)
    if path.endswith("/vendor/offline-status.js"):
        route.fulfill(
            body="window.CentralPDFOfflineStatus=Object.freeze({pdfLib:true,pdfJs:true,pdfWorker:true});",
            content_type="application/javascript",
        )
        return
    if path.endswith("/vendor/pdf-lib.min.js"):
        route.fulfill(path=str(ROOT / "app" / "node_modules" / "pdf-lib" / "dist" / "pdf-lib.min.js"), content_type="application/javascript")
        return
    marker = "/vendor/pdfjs/"
    if marker in path:
        suffix = path.split(marker, 1)[1]
        if suffix in {"pdf.min.mjs", "pdf.worker.min.mjs"}:
            target = ROOT / "app" / "node_modules" / "pdfjs-dist" / "legacy" / "build" / suffix
        else:
            target = ROOT / "app" / "node_modules" / "pdfjs-dist" / suffix
        if target.is_file():
            route.fulfill(path=str(target), content_type=_mime(target))
            return
    route.continue_()


def _corpus_url(base_url: str, relative: str) -> str:
    from urllib.parse import quote

    return f"{base_url}/tests/pdf-corpus/cache/{quote(relative, safe='/')}"


def _legacy_dispatch(page, base_url: str, files: list[dict], mode: str) -> None:
    payload = [{"url": _corpus_url(base_url, item["file"]), "name": item["name"]} for item in files]
    page.evaluate(
        """async ({entries, mode}) => {
          const transfer = new DataTransfer();
          for (const entry of entries) {
            const bytes = await (await fetch(entry.url)).arrayBuffer();
            transfer.items.add(new File([bytes], entry.name, {type:'application/pdf'}));
          }
          if (mode === 'click') {
            const input = document.querySelector('#fileInput');
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', {bubbles:true}));
          } else {
            document.querySelector('#dropzone').dispatchEvent(new DragEvent('drop', {
              dataTransfer: transfer, bubbles:true, cancelable:true
            }));
          }
        }""",
        {"entries": payload, "mode": mode},
    )


def _react_entries(files: list[dict]) -> list[dict]:
    return [
        {
            "name": item["name"],
            "base64": base64.b64encode((CORPUS_ROOT / item["file"]).read_bytes()).decode("ascii"),
        }
        for item in files
    ]


def _react_dispatch(page, files: list[dict], mode: str) -> None:
    page.evaluate(
        """({entries, mode}) => {
          const transfer = new DataTransfer();
          for (const entry of entries) {
            const raw = atob(entry.base64);
            const bytes = new Uint8Array(raw.length);
            for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
            transfer.items.add(new File([bytes], entry.name, {type:'application/pdf'}));
          }
          if (mode === 'click') {
            const input = document.querySelector('input[type=file]');
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', {bubbles:true}));
          } else {
            const target = document.querySelector('.cp-dropzone');
            target.dispatchEvent(new DragEvent('drop', {dataTransfer:transfer,bubbles:true,cancelable:true}));
          }
        }""",
        {"entries": _react_entries(files), "mode": mode},
    )


@contextmanager
def _vite_server():
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the React/Vite runtime gate")
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    process = subprocess.Popen(
        [node, str(ROOT / "app" / "node_modules" / "vite" / "bin" / "vite.js"), "--host", "127.0.0.1", "--port", str(port), "--strictPort"],
        cwd=ROOT / "app",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError("Vite exited before becoming ready")
            try:
                with urllib.request.urlopen(url, timeout=1):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise TimeoutError("Vite did not become ready")
        yield url
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()


def _named(case: dict, name: str | None = None) -> dict:
    return {"file": case["file"], "name": name or Path(case["file"]).name}


def run_runtime_gate(base_url: str, playwright, manifest: dict) -> dict:
    valid = [case for case in manifest["cases"] if case["expected"] == "PASS" and (CORPUS_ROOT / case["file"]).stat().st_size < 120_000]
    batch = [_named(case) for case in valid[:19]]
    fake = next(case for case in manifest["cases"] if case["id"] == "generated-fake")
    encrypted = next(case for case in manifest["cases"] if case["id"] == "pdfium-encrypted")
    basic = next(case for case in manifest["cases"] if case["id"] == "generated-basic")
    stress = [_named(basic, f"stress-{index:02d}.pdf") for index in range(1, 51)]
    mixed = [_named(valid[0], "valid-1.pdf"), _named(valid[1], "valid-2.pdf"), _named(encrypted, "protected.pdf"), _named(valid[2], "valid-3.pdf"), _named(fake, "invalid.pdf"), _named(valid[3], "valid-4.pdf")]
    result = {"legacy": {}, "react": {}, "filesLost": 0, "unexpectedDuplicates": 0, "unhandledRejections": 0}
    accounting: list[tuple[list[str], list[str]]] = []

    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = browser.new_context()
    context.route("**/*", _route_legacy_engines)
    page = context.new_page()
    legacy_errors: list[str] = []
    page.on("pageerror", lambda error: legacy_errors.append(str(error)))
    page.goto(f"{base_url}/index.html", wait_until="domcontentloaded")
    page.wait_for_function("window.CentralPDFEngineStatus?.ready === true")
    page.locator('.tool-card[data-tool="merge"]').click()

    _legacy_dispatch(page, base_url, batch + [_named(fake, "invalid.pdf")], "drop")
    page.wait_for_function("window.CentralPDFApp.getFiles().length === 19", timeout=60_000)
    page.wait_for_function("document.querySelector('#statusBox').textContent.includes('invalid.pdf')", timeout=120_000)
    loaded = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    expected_batch = [item["name"] for item in batch]
    expected_legacy_batch = sorted(expected_batch, key=str.casefold)
    result["legacy"]["batch19Plus1"] = loaded == expected_legacy_batch
    result["legacy"]["batchExpectedNames"] = expected_legacy_batch
    result["legacy"]["batchObservedNames"] = loaded
    accounting.append((expected_legacy_batch, loaded))

    page.evaluate("CentralPDFApp.clearAll()")
    _legacy_dispatch(page, base_url, mixed, "drop")
    page.wait_for_function("document.querySelector('#statusBox').textContent.includes('invalid.pdf')", timeout=120_000)
    mixed_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    result["legacy"]["mixedProtectedInvalid"] = mixed_names == ["valid-1.pdf", "valid-2.pdf", "valid-3.pdf", "valid-4.pdf"]
    result["legacy"]["mixedObservedNames"] = mixed_names
    accounting.append((["valid-1.pdf", "valid-2.pdf", "valid-3.pdf", "valid-4.pdf"], mixed_names))

    page.evaluate("CentralPDFApp.clearAll()")
    _legacy_dispatch(page, base_url, [_named(basic, "z-click-first.pdf")], "click")
    _legacy_dispatch(page, base_url, [_named(basic, "a-drop-second.pdf")], "drop")
    page.wait_for_function("window.CentralPDFApp.getFiles().length === 2")
    page.wait_for_timeout(1_000)
    click_drop_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    result["legacy"]["clickDropOrder"] = click_drop_names == ["a-drop-second.pdf", "z-click-first.pdf"]
    accounting.append((["a-drop-second.pdf", "z-click-first.pdf"], click_drop_names))

    page.evaluate("CentralPDFApp.clearAll()")
    _legacy_dispatch(page, base_url, [_named(basic, "z-drop-first.pdf")], "drop")
    _legacy_dispatch(page, base_url, [_named(basic, "a-drop-second.pdf")], "drop")
    page.wait_for_function("window.CentralPDFApp.getFiles().length === 2")
    page.wait_for_timeout(1_000)
    drop_drop_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    result["legacy"]["dropDropOrder"] = drop_drop_names == ["a-drop-second.pdf", "z-drop-first.pdf"]
    accounting.append((["a-drop-second.pdf", "z-drop-first.pdf"], drop_drop_names))

    page.evaluate("CentralPDFApp.clearAll(); window.pdfjsLib.GlobalWorkerOptions.workerSrc='/missing-compat-worker.mjs'")
    _legacy_dispatch(page, base_url, [_named(basic, "thumbnail-fallback.pdf")], "drop")
    page.wait_for_function("window.CentralPDFApp.getFiles().length === 1")
    fallback_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    result["legacy"]["thumbnailFallbackRetainsFile"] = fallback_names == ["thumbnail-fallback.pdf"]
    accounting.append((["thumbnail-fallback.pdf"], fallback_names))

    page.reload(wait_until="domcontentloaded")
    page.wait_for_function("window.CentralPDFEngineStatus?.ready === true")
    page.locator('.tool-card[data-tool="merge"]').click()
    _legacy_dispatch(page, base_url, stress, "drop")
    page.wait_for_function("window.CentralPDFApp.getFiles().length === 50", timeout=120_000)
    legacy_stress_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    expected_stress = [item["name"] for item in stress]
    result["legacy"]["stress50"] = legacy_stress_names == expected_stress
    accounting.append((expected_stress, legacy_stress_names))
    result["unhandledRejections"] += len(legacy_errors)
    context.close()

    with _vite_server() as vite_url:
        page = browser.new_page()
        react_errors: list[str] = []
        page.on("pageerror", lambda error: react_errors.append(str(error)))

        def open_merge() -> None:
            page.goto(vite_url, wait_until="domcontentloaded")
            page.get_by_role("button", name="Juntar PDFs", exact=True).wait_for()
            page.get_by_role("button", name="Juntar PDFs", exact=True).click()
            page.wait_for_selector(".cp-dropzone")

        open_merge()
        _react_dispatch(page, batch + [_named(fake, "invalid.pdf")], "drop")
        page.wait_for_function("document.querySelectorAll('.cp-file-item').length === 19", timeout=120_000)
        react_batch_names = page.locator(".cp-file-item__name").all_inner_texts()
        result["react"]["batch19Plus1"] = react_batch_names == expected_batch and "invalid.pdf" in page.locator("[role=alert]").inner_text()
        accounting.append((expected_batch, react_batch_names))

        open_merge()
        _react_dispatch(page, mixed, "drop")
        page.wait_for_function("document.querySelectorAll('.cp-file-item').length === 4", timeout=120_000)
        react_mixed_names = page.locator(".cp-file-item__name").all_inner_texts()
        result["react"]["mixedProtectedInvalid"] = react_mixed_names == ["valid-1.pdf", "valid-2.pdf", "valid-3.pdf", "valid-4.pdf"] and "protected.pdf" in page.locator("[role=alert]").inner_text()
        accounting.append((["valid-1.pdf", "valid-2.pdf", "valid-3.pdf", "valid-4.pdf"], react_mixed_names))

        open_merge()
        _react_dispatch(page, [_named(basic, "z-click-first.pdf")], "click")
        _react_dispatch(page, [_named(basic, "a-drop-second.pdf")], "drop")
        page.wait_for_function("document.querySelectorAll('.cp-file-item').length === 2")
        react_click_drop_names = page.locator(".cp-file-item__name").all_inner_texts()
        result["react"]["clickDropOrder"] = react_click_drop_names == ["z-click-first.pdf", "a-drop-second.pdf"]
        accounting.append((["z-click-first.pdf", "a-drop-second.pdf"], react_click_drop_names))

        open_merge()
        _react_dispatch(page, [_named(basic, "z-drop-first.pdf")], "drop")
        _react_dispatch(page, [_named(basic, "a-drop-second.pdf")], "drop")
        page.wait_for_function("document.querySelectorAll('.cp-file-item').length === 2")
        react_drop_drop_names = page.locator(".cp-file-item__name").all_inner_texts()
        result["react"]["dropDropOrder"] = react_drop_drop_names == ["z-drop-first.pdf", "a-drop-second.pdf"]
        accounting.append((["z-drop-first.pdf", "a-drop-second.pdf"], react_drop_drop_names))

        open_merge()
        _react_dispatch(page, stress, "drop")
        page.wait_for_function("document.querySelectorAll('.cp-file-item').length === 50", timeout=180_000)
        react_stress_names = page.locator(".cp-file-item__name").all_inner_texts()
        result["react"]["stress50"] = react_stress_names == expected_stress
        accounting.append((expected_stress, react_stress_names))
        result["unhandledRejections"] += len(react_errors)
        page.close()

    browser.close()
    all_checks = [value for value in [*result["legacy"].values(), *result["react"].values()] if isinstance(value, bool)]
    result["filesLost"] = sum(sum((Counter(expected) - Counter(observed)).values()) for expected, observed in accounting)
    result["unexpectedDuplicates"] = sum(sum((Counter(observed) - Counter(expected)).values()) for expected, observed in accounting)
    result["result"] = "PASS" if all(all_checks) and result["filesLost"] == result["unexpectedDuplicates"] == result["unhandledRejections"] == 0 else "FAIL"
    return result
