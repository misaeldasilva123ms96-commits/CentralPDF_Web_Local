"""Teste de producao do CentralPDF 2.0.

Monta uma estrutura equivalente ao GitHub Pages, serve com HTTP e navega pelo
caminho real /CentralPDF_Web_Local/, validando:

- ausencia de 404/500 e falhas de rede/console durante o carregamento;
- presenca dos assets de runtime no dist (JS, CSS, fontes, worker do PDF.js,
  WASM do QPDF);
- layout por propriedades computadas (grid, cards com fundo/borda/raio,
  campo de busca e botoes estilizados, badges separados, cabecalho alinhado);
- ausencia de overflow horizontal em desktop e mobile;
- screenshots desktop (1366x768) e mobile (390x844);

Tambem executa o pacote local (servidor Go) servindo o dist em /index.html e
valida o endpoint /__health.
"""

import json
import os
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
DIST = APP / "dist"
APP_VERSION = json.loads((APP / "package.json").read_text(encoding="utf-8"))["version"]
SCREENSHOT_DIR = ROOT / "tests" / "screenshots" / APP_VERSION

REQUIRED_DIST_FILES = [
    "index.html",
    "assets/index-*.css",
    "assets/index-*.js",
    "standard_fonts/LiberationSans-Regular.ttf",
    "standard_fonts/LICENSE_LIBERATION",
]

REQUIRED_RUNTIME_PATTERNS = [
    "assets/pdf.worker-*.mjs",
    "assets/qpdf-*.wasm",
    "assets/pdf-*.js",
]

DESKTOP_VIEWPORT = (1366, 768)
MOBILE_VIEWPORT = (390, 844)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run(cmd, cwd=None):
    result = subprocess.run(
        cmd,
        cwd=cwd or ROOT,
        capture_output=True,
        text=True,
        shell=os.name == "nt",
    )
    if result.returncode != 0:
        print(result.stdout[-2000:])
        print(result.stderr[-2000:])
        raise SystemExit(f"comando falhou: {cmd}")
    return result


def locate_full_chromium():
    browsers = Path(os.environ.get("LOCALAPPDATA", "")) / "ms-playwright"
    candidates = [
        "chromium-*/chrome-win64/chrome.exe",
        "chromium-*/chrome-win/chrome.exe",
        "chromium-*/chrome-linux/chrome",
        "chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    ]
    for pattern in candidates:
        matches = list(browsers.glob(pattern))
        if matches:
            return str(matches[-1])
    return None


def launch_browser(pw):
    browser = None
    for executable in (None, locate_full_chromium()):
        if executable is None and browser is not None:
            continue
        if executable is None:
            browser = pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )
        else:
            browser = pw.chromium.launch(
                executable_path=executable,
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )
        try:
            probe = browser.new_page()
            probe.goto("data:text/html,ok", timeout=15000)
            probe.close()
            return browser
        except Exception:
            browser.close()
            browser = None
    raise RuntimeError("nenhum executavel do Chromium disponivel")


def build():
    run(["npm", "ci"], cwd=APP)
    run(["npm", "run", "build"], cwd=APP)


def verify_dist():
    missing = []
    for pattern in REQUIRED_DIST_FILES + REQUIRED_RUNTIME_PATTERNS:
        if not list(DIST.glob(pattern)):
            missing.append(pattern)
    if missing:
        raise SystemExit(f"assets obrigatorios ausentes no dist: {missing}")


def collect_failures(page):
    failures = []

    def on_console(msg):
        if msg.type == "error":
            failures.append(f"console.error: {msg.text}")

    def on_pageerror(exc):
        failures.append(f"pageerror: {exc}")

    def on_request_failed(req):
        failures.append(f"requestfailed: {req.url}")

    def on_response(res):
        if res.status >= 400:
            failures.append(f"HTTP {res.status}: {res.url}")
    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("requestfailed", on_request_failed)
    page.on("response", on_response)
    return failures


def assert_no_failed_request(failures):
    relevant = [
        f
        for f in failures
        if not (
            "favicon" in f
            or "Failed to load resource: the server responded with a status of 404" in f
        )
    ]
    if relevant:
        print("DEBUG-FAILURES:", failures)
        raise AssertionError(f"recursos com falha durante o carregamento: {relevant[:6]}")


def computed(page, selector, prop):
    return page.evaluate(
        """([sel, p]) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            return getComputedStyle(el)[p];
        }""",
        [selector, prop],
    )


def to_px(value):
    if not value:
        return 0.0
    try:
        return float(str(value).replace("px", ""))
    except ValueError:
        return 0.0


def assert_layout(page):
    problems = []

    body_bg = computed(page, "body", "backgroundColor")
    if not body_bg or body_bg in ("transparent", "rgba(0, 0, 0, 0)"):
        problems.append(f"body sem fundo tematico: {body_bg}")

    grid_display = computed(page, ".cp-tool-grid", "display")
    if grid_display != "grid":
        problems.append(f"grid de ferramentas nao e grid: {grid_display}")

    card_checks = {
        "background": ("backgroundColor", lambda v: not v or v == "rgba(0, 0, 0, 0)"),
        "border": ("borderTopWidth", lambda v: to_px(v) == 0),
        "radius": ("borderTopLeftRadius", lambda v: to_px(v) == 0),
        "padding": ("paddingTop", lambda v: to_px(v) == 0),
    }
    for name, (prop, bad) in card_checks.items():
        value = computed(page, ".cp-tool-card", prop)
        if bad(value):
            problems.append(f"card sem {name}: {value}")

    search_radius = to_px(computed(page, ".cp-home__search", "borderRadius"))
    search_padding = to_px(computed(page, ".cp-home__search", "paddingTop"))
    if search_radius == 0:
        problems.append("campo de busca sem estilo arredondado")
    if search_padding == 0:
        problems.append("campo de busca sem preenchimento")

    fav_bg = computed(page, ".cp-fav-btn", "backgroundColor")
    fav_border = computed(page, ".cp-fav-btn", "borderTopStyle")
    if fav_border not in ("none", "hidden") or fav_bg == "":
        problems.append(f"botao de favorito com estilo padrao do navegador: bg {fav_bg}, border {fav_border}")

    card_count = page.locator(".cp-tool-card").count()
    if card_count < 3:
        problems.append(f"poucos cards visiveis: {card_count}")

    for card in page.locator(".cp-tool-card").all():
        if card.locator(".cp-badge").count() < 1:
            problems.append("card sem badge")

    header_display = computed(page, ".app-header", "display")
    if header_display not in ("flex", "grid"):
        problems.append(f"cabecalho sem layout: {header_display}")

    overflow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if overflow > 1:
        problems.append(f"overflow horizontal: {overflow}px")

    if problems:
        raise AssertionError("; ".join(problems))


def navigate_and_check(browser, url):
    page = browser.new_page(viewport=dict(width=DESKTOP_VIEWPORT[0], height=DESKTOP_VIEWPORT[1]))
    failures = collect_failures(page)
    response = page.goto(url, wait_until="networkidle")
    if response is None or not response.ok:
        raise SystemExit(f"navegacao falhou: {response.status if response else 'sem resposta'}")
    assert_no_failed_request(failures)
    assert_layout(page)
    return page


def run_pages_scenario(browser, serve_root, pages_root):
    for item in DIST.iterdir():
        dest = pages_root / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(serve_root), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        page = navigate_and_check(
            browser,
            f"http://127.0.0.1:{port}/CentralPDF_Web_Local/",
        )
        page.screenshot(path=str(SCREENSHOT_DIR / "desktop-1366.png"), full_page=True)

        page.set_viewport_size(dict(width=MOBILE_VIEWPORT[0], height=MOBILE_VIEWPORT[1]))
        page.reload(wait_until="networkidle")
        overflow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        if overflow > 1:
            raise AssertionError(f"overflow horizontal em mobile: {overflow}px")
        page.screenshot(path=str(SCREENSHOT_DIR / "mobile-390.png"), full_page=True)
    finally:
        server.shutdown()
        server.server_close()


def run_local_package_scenario(browser, local_root):
    if shutil.which("go") is None:
        print("production-ui-2.0: go ausente no PATH; cenário do pacote local ignorado")
        return
    local_root.mkdir(parents=True, exist_ok=True)
    for item in DIST.iterdir():
        dest = local_root / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    exe = local_root / "CentralPDF_Local_Server"
    run(["go", "build", "-o", str(exe), "."], cwd=str(ROOT / "server"))

    env = dict(os.environ)
    env["CENTRALPDF_PRINT_URL"] = "1"
    env["CENTRALPDF_NO_BROWSER"] = "1"
    proc = subprocess.Popen(
        [str(exe)],
        cwd=str(local_root),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        url = None
        lines = queue.Queue()

        def _reader(stream, q):
            for line in iter(stream.readline, ""):
                q.put(line)
            q.put(None)

        threading.Thread(target=_reader, args=(proc.stdout, lines), daemon=True).start()

        deadline = time.time() + 30
        while time.time() < deadline:
            if proc.poll() is not None:
                raise SystemExit(
                    f"servidor local encerrou antes de imprimir a URL (exit {proc.poll()}); "
                    f"stderr: {proc.stderr.read()[-500:]}"
                )
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                continue
            if line is None:
                break
            line = line.strip()
            if line.startswith("http://"):
                url = line
                break
        if not url:
            raise SystemExit(f"servidor local nao imprimiu a URL (stderr: {proc.stderr.read()[-500:]})")

        page = navigate_and_check(browser, url)
        version_visible = page.evaluate(f"() => document.body.innerText.includes('{APP_VERSION}')")
        if not version_visible:
            raise AssertionError("v2.0.0-alpha.2 nao visivel na interface do pacote local")

        port = url.split(":")[2].split("/")[0]
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/__health", timeout=5) as resp:
            health = json.loads(resp.read().decode())
        if health.get("version") != APP_VERSION:
            raise SystemExit(f"__health com versao inesperada: {health}")
        page.close()
    finally:
        proc.kill()
        proc.wait()


def main():
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    build()
    verify_dist()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_root = Path(tmp)
        pages_root = tmp_root / "CentralPDF_Web_Local"
        pages_root.mkdir(parents=True, exist_ok=True)
        with sync_playwright() as pw:
            browser = launch_browser(pw)
            run_pages_scenario(browser, tmp_root, pages_root)
            run_local_package_scenario(browser, tmp_root / "localpkg")
            browser.close()
    print("production-ui-2.0: passed")


if __name__ == "__main__":
    main()