#!/usr/bin/env python3
"""CentralPDF Compatibility Gate 1.0 — optional real-PDF browser gate."""

from __future__ import annotations

from collections import Counter
from contextlib import contextmanager
import functools
import hashlib
import http.server
import json
from pathlib import Path
import socketserver
import sys
import threading
from urllib.parse import quote

from playwright.sync_api import sync_playwright
from pdf_compatibility_runtime import run_runtime_gate


ROOT = Path(__file__).resolve().parents[1]
CORPUS_ROOT = ROOT / "tests" / "pdf-corpus" / "cache"
MANIFEST_PATH = ROOT / "tests" / "pdf-corpus" / "manifest.json"
RESULT_PATH = CORPUS_ROOT / "compatibility-result.json"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *_args: object) -> None:
        return


@contextmanager
def static_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_address[1]}"
        finally:
            server.shutdown()
            thread.join(timeout=5)


def verify_fixture(case: dict) -> Path:
    target = (CORPUS_ROOT / case["file"]).resolve()
    if CORPUS_ROOT.resolve() not in target.parents:
        raise AssertionError(f"Unsafe fixture path: {case['file']}")
    data = target.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    if actual != case["sha256"]:
        raise AssertionError(f"Fixture hash mismatch for {case['id']}: {actual}")
    return target


def matches_expectation(expected: str, observed: dict) -> tuple[bool, list[str]]:
    failures: list[str] = []
    if expected == "PASS":
        for stage in ("ingest", "pdfjs", "render", "thumbnail", "pdfLib", "arrayBuffer", "cleanup"):
            if observed[stage] != "PASS":
                failures.append(f"{stage}={observed[stage]}")
        if observed["toolReady"] != "EDITABLE":
            failures.append(f"toolReady={observed['toolReady']}")
    else:
        if observed["ingest"] != "EXPECTED_REJECTION":
            failures.append(f"ingest={observed['ingest']}")
        if observed["pdfjs"] not in {"PASSWORD", "EXPECTED_FAILURE"}:
            failures.append(f"pdfjs={observed['pdfjs']}")
        if observed["pdfLib"] != "EXPECTED_UNSUPPORTED":
            failures.append(f"pdfLib={observed['pdfLib']}")
        for stage in ("arrayBuffer", "cleanup"):
            if observed[stage] != "PASS":
                failures.append(f"{stage}={observed[stage]}")
    if observed["unhandled"]:
        failures.append(f"unhandled={observed['unhandled']}")
    return not failures, failures


def main() -> int:
    runtime_only = "--runtime-only" in sys.argv[1:]
    unknown = [argument for argument in sys.argv[1:] if argument != "--runtime-only"]
    if unknown:
        raise SystemExit(f"Unknown arguments: {' '.join(unknown)}")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for case in manifest["cases"]:
        verify_fixture(case)

    results = []
    with static_server() as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        if not runtime_only:
            page = browser.new_page()
            page.goto(f"{base_url}/tests/pdf-corpus/harness.html", wait_until="load")
            page.wait_for_function("window.compatReady === true")
            for index, case in enumerate(manifest["cases"]):
                fixture_url = f"{base_url}/tests/pdf-corpus/cache/{quote(case['file'], safe='/')}"
                observed = page.evaluate("url => window.runCompatibilityCase(url)", fixture_url)
                passed, failures = matches_expectation(case["expected"], observed)
                row = {**case, "observed": observed, "result": "PASS" if passed else "UNEXPECTED_FAILURE", "failures": failures}
                results.append(row)
                print(f"[{index + 1:02d}/{len(manifest['cases'])}] {case['id']}: {row['result']}" + (f" ({', '.join(failures)})" if failures else ""))
        browser.close()
        runtime = run_runtime_gate(base_url, playwright, manifest)

    if runtime_only:
        print(json.dumps(runtime, ensure_ascii=False, indent=2))
        return 0 if runtime["result"] == "PASS" else 1

    counters = {
        "corpus": len(results),
        "sources": dict(Counter(row["source"] for row in results)),
        "ingest": dict(Counter(row["observed"]["ingest"] for row in results)),
        "pdfjs": dict(Counter(row["observed"]["pdfjs"] for row in results)),
        "pdfLib": dict(Counter(row["observed"]["pdfLib"] for row in results)),
        "render": dict(Counter(row["observed"]["render"] for row in results)),
        "thumbnail": dict(Counter(row["observed"]["thumbnail"] for row in results)),
        "unexpected": sum(row["result"] != "PASS" for row in results),
        "detachmentRegressions": sum(row["observed"]["arrayBuffer"] != "PASS" for row in results),
        "unhandledRejections": sum(bool(row["observed"]["unhandled"]) for row in results),
    }
    counters["runtime"] = runtime
    payload = {"gate": manifest["version"], "summary": counters, "results": results}
    RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\nCENTRALPDF COMPATIBILITY GATE 1.0")
    print(json.dumps(counters, ensure_ascii=False, indent=2))
    return 0 if counters["unexpected"] == counters["detachmentRegressions"] == counters["unhandledRejections"] == 0 and runtime["result"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
