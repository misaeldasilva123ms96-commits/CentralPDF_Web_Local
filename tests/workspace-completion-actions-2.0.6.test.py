from pathlib import Path
import os
import re
import tempfile

from PIL import Image
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
soup = BeautifulSoup(index, "html.parser")

completion = soup.select_one("#completionActions")
assert completion is not None
assert "hidden" in completion.get("class", [])
assert completion.get("role") == "dialog"
assert completion.get("aria-modal") == "true"
assert completion.get("aria-labelledby") == "completionTitle"
assert completion.parent.name == "body"
assert completion.select_one(".completion-dialog") is not None
assert completion.select_one("#continueEditingButton") is not None
assert completion.select_one("#clearButton") is not None
assert soup.select_one(".panel-heading #clearButton") is None
assert soup.select_one("#dropzone").get("tabindex") == "0"

style_paths = [
    link.get("href", "").split("?", 1)[0]
    for link in soup.select('link[rel="stylesheet"]')
]
css = "\n".join(
    (root / path).read_text(encoding="utf-8")
    for path in style_paths
    if path.startswith("assets/css/")
)

layout_html = f"""<!doctype html><html><head><style>{css}</style></head>
<body data-theme="dark" data-workspace-open="true">
  <header class="topbar">
    <div class="top-actions">
      <div class="cp101-settings-menu">
        <button class="cp101-settings-trigger">Configurações</button>
        <div class="cp101-settings-panel"><div class="cp101-settings-body">Aparência</div></div>
      </div>
    </div>
  </header>
  <main class="workspace">
    <section class="main-panel">Conteúdo</section>
    <aside class="settings-panel">
      <div class="settings-heading"><div><h2>Resumo</h2><p>Descrição normal.</p></div></div>
      <div style="height:900px">Opções</div>
    </aside>
  </main>
  <section class="completion-actions" role="dialog" aria-modal="true">
    <div class="completion-dialog">Resultado concluído</div>
  </section>
</body></html>"""

runtime_html = re.sub(r"\s*<link[^>]+(?:stylesheet|manifest)[^>]*>", "", index)
runtime_html = runtime_html.replace("</head>", f"<style>{css}</style></head>")
runtime_html = re.sub(r"\s*<script src=\"[^\"]+\"></script>", "", runtime_html)
jszip = (root / "vendor/jszip.min.js").read_text(encoding="utf-8")
scripts = "\n".join(
    (root / name).read_text(encoding="utf-8")
    for name in [
        "assets/js/split-planner.js",
        "assets/js/advanced-planner.js",
        "assets/js/organizer-planner.js",
        "assets/js/pdf-editor.js",
        "assets/js/ux-enhancements.js",
        "assets/js/app.js",
        "assets/js/layout-controls.js",
        "assets/js/foundation.js",
    ]
)
stubs = "window.PDFLib={PDFDocument:{}};window.pdfjsLib={};window.CentralPDFEngineStatus={ready:true,engines:{pdfLib:{ready:true,source:'test'},pdfJs:{ready:true,source:'test'}}};"
runtime_html = runtime_html.replace(
    "</body>", f"<script>{jszip}</script><script>{stubs}</script><script>{scripts}</script></body>"
)

with tempfile.TemporaryDirectory() as temp_dir, sync_playwright() as playwright:
    image_path = Path(temp_dir) / "teste.png"
    Image.new("RGB", (24, 18), "white").save(image_path)
    launch_options = {
        "headless": True,
        "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    }
    if executable_path := os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"):
        launch_options["executable_path"] = executable_path
    browser = playwright.chromium.launch(**launch_options)

    layout_page = browser.new_page(viewport={"width": 1368, "height": 600})
    layout_page.set_content(layout_html, wait_until="domcontentloaded")
    layout = layout_page.evaluate("""() => ({
      topbarZ: Number(getComputedStyle(document.querySelector('.topbar')).zIndex),
      inspectorZ: Number(getComputedStyle(document.querySelector('.settings-panel')).zIndex),
      headingPosition: getComputedStyle(document.querySelector('.settings-heading')).position,
      overlayPosition: getComputedStyle(document.querySelector('.completion-actions')).position,
      overlayZ: Number(getComputedStyle(document.querySelector('.completion-actions')).zIndex),
      overlayRect: document.querySelector('.completion-actions').getBoundingClientRect().toJSON(),
      dialogRect: document.querySelector('.completion-dialog').getBoundingClientRect().toJSON(),
    })""")
    assert layout["topbarZ"] > layout["inspectorZ"], layout
    assert layout["headingPosition"] == "static", layout
    assert layout["overlayPosition"] == "fixed", layout
    assert layout["overlayZ"] > layout["topbarZ"], layout
    assert layout["overlayRect"]["width"] == 1368, layout
    assert layout["overlayRect"]["height"] == 600, layout
    assert layout["dialogRect"]["width"] >= 640, layout
    assert abs(layout["dialogRect"]["x"] + layout["dialogRect"]["width"] / 2 - 684) <= 1, layout
    assert abs(layout["dialogRect"]["y"] + layout["dialogRect"]["height"] / 2 - 300) <= 1, layout

    page = browser.new_page(viewport={"width": 1368, "height": 700}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(runtime_html, wait_until="domcontentloaded")

    expected_labels = {
        "organize": ("Continuar organizando", "Nova organização"),
        "editPdf": ("Continuar editando", "Nova edição"),
        "merge": ("Continuar juntando", "Nova junção"),
        "split": ("Continuar dividindo", "Nova divisão"),
        "extract": ("Continuar extraindo", "Nova extração"),
        "rotate": ("Continuar girando", "Nova rotação"),
        "watermark": ("Continuar ajustando", "Nova marca-d’água"),
        "pageNumbers": ("Continuar numerando", "Nova numeração"),
        "imagesToPdf": ("Continuar montando", "Novo PDF de imagens"),
        "imageConvert": ("Continuar convertendo", "Nova conversão"),
        "compress": ("Continuar comprimindo", "Nova compressão"),
        "pdfToImage": ("Continuar convertendo", "Nova conversão em imagens"),
        "crop": ("Continuar recortando", "Novo recorte"),
        "metadata": ("Continuar limpando", "Nova limpeza"),
        "normalize": ("Continuar normalizando", "Nova normalização"),
        "pdfToText": ("Continuar extraindo", "Nova extração de texto"),
        "ocr": ("Continuar reconhecendo", "Novo OCR"),
        "compare": ("Continuar comparando", "Nova comparação"),
        "redact": ("Continuar censurando", "Nova censura"),
        "formBuilder": ("Continuar criando", "Novo formulário"),
        "signPdf": ("Continuar assinando", "Nova assinatura"),
        "pdfToOffice": ("Continuar convertendo", "Nova conversão para Office"),
        "documentsToPdf": ("Continuar convertendo", "Nova conversão para PDF"),
        "extractImages": ("Continuar extraindo", "Nova extração de imagens"),
        "archivePdf": ("Continuar preparando", "Novo arquivamento"),
        "documentAssistant": ("Continuar analisando", "Nova análise"),
        "structuredExtraction": ("Continuar extraindo", "Nova extração estruturada"),
        "documentAudit": ("Continuar auditando", "Nova auditoria"),
        "classifyRename": ("Continuar classificando", "Nova classificação"),
        "protect": ("Continuar protegendo", "Nova proteção"),
        "unlock": ("Continuar desbloqueando", "Nova remoção de senha"),
        "diagnose": ("Continuar diagnosticando", "Novo diagnóstico"),
        "repairAdvanced": ("Continuar recuperando", "Nova recuperação"),
        "flattenForms": ("Continuar fixando", "Nova fixação"),
    }
    for tool, labels in expected_labels.items():
        page.evaluate("tool => CentralPDFApp.selectTool(tool)", tool)
        assert page.locator("#continueEditingButton").inner_text() == labels[0]
        assert page.locator("#clearButton").inner_text() == labels[1]

    page.evaluate("() => CentralPDFApp.selectTool('imageConvert')")
    assert page.locator("#completionActions").is_hidden()
    assert page.locator("#clearButton").is_hidden()

    page.locator("#fileInput").set_input_files(str(image_path))
    page.wait_for_function("document.querySelector('#fileCount').textContent.includes('1 arquivo')")
    assert page.locator("#completionActions").is_hidden()

    with page.expect_download():
        page.locator("#processButton").click()
    page.locator("#completionActions").wait_for(state="visible")
    assert page.locator("#processButton").is_hidden()
    assert page.locator("#continueEditingButton").is_visible()
    assert page.locator("#clearButton").is_visible()
    assert page.evaluate("document.activeElement === document.querySelector('#continueEditingButton')")
    assert page.locator(".app-shell").get_attribute("inert") is not None
    assert page.locator("#continueEditingButton").inner_text() == "Continuar convertendo"
    assert page.locator("#clearButton").inner_text() == "Nova conversão"

    page.keyboard.press("Shift+Tab")
    assert page.evaluate("document.activeElement === document.querySelector('#clearButton')")
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement === document.querySelector('#continueEditingButton')")

    page.locator("#continueEditingButton").click()
    assert page.locator("#completionActions").is_hidden()
    assert page.locator(".app-shell").get_attribute("inert") is None
    assert page.locator("#processButton").is_visible()
    assert page.locator("#fileCount").inner_text().startswith("1 ")
    page.wait_for_function("document.activeElement === document.querySelector('#processButton')")

    with page.expect_download():
        page.locator("#processButton").click()
    page.locator("#completionActions").wait_for(state="visible")

    page.set_viewport_size({"width": 390, "height": 320})
    overlay = page.locator("#completionActions")
    mobile = page.locator(".completion-dialog").bounding_box()
    assert mobile is not None
    assert mobile["width"] <= 358, mobile
    assert mobile["x"] >= 16, mobile
    assert overlay.evaluate("element => getComputedStyle(element).overflowY") == "auto"
    overlay.evaluate("element => { element.scrollTop = element.scrollHeight; }")
    clear_box = page.locator("#clearButton").bounding_box()
    assert clear_box is not None
    assert clear_box["y"] >= 0, clear_box
    assert clear_box["y"] + clear_box["height"] <= 320, clear_box

    page.locator("#clearButton").click()
    assert page.locator("#completionActions").is_hidden()
    assert page.locator(".app-shell").get_attribute("inert") is None
    assert page.locator("#fileCount").inner_text().startswith("0 ")
    page.wait_for_function("document.activeElement === document.querySelector('#dropzone')")
    assert not errors, errors
    browser.close()

print("workspace-completion-actions-2.0.6: passed")
