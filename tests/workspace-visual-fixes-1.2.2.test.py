from pathlib import Path
from playwright.sync_api import sync_playwright
import re


root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
links = re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/>', index)
assert "assets/css/workspace-visual-fixes-1.2.2.css" in links
css = "\n".join((root / link).read_text(encoding="utf-8") for link in links)
service_worker = (root / "sw.js").read_text(encoding="utf-8")
assert "'./assets/css/workspace-visual-fixes-1.2.2.css'" in service_worker
assert "centralpdf-v1.2.1-pages-2" in service_worker

html = f"""<!doctype html><html><head><style>{css}</style></head>
<body data-theme="dark">
  <section class="pdf-editor-section">
    <div class="pdf-editor-toolbar">
      <div class="editor-tool-group"><button class="editor-tool active">Selecionar</button><button class="editor-tool">Texto</button><button class="editor-tool">Pincel</button><button class="editor-tool">Marcador</button><button class="editor-tool">Cobrir</button><button class="editor-tool">Recortar</button></div>
      <div class="editor-tool-group secondary"><button class="editor-action">Imagem</button><button class="editor-action">Páginas de PDF</button><button class="editor-action">Página em branco</button></div>
    </div>
    <div class="pdf-editor-subtoolbar">Ações da página</div>
    <div class="editor-work-header"><span>Selecionar objetos</span><span>Página 1</span></div>
    <div class="editor-stage">Papel</div><div class="editor-status">Pronto</div>
  </section>
  <section class="redaction-section"><div class="redaction-toolbar"><button>Censurar</button></div><div class="redaction-layout"><aside><strong>Páginas</strong><button>1</button></aside><main><div id="redactCanvasWrap">Papel</div></main></div></section>
  <section class="cp18-designer"><div class="cp18-designer-toolbar"><button>Campo</button></div><div class="cp18-designer-layout"><aside><strong>Páginas</strong><button>1</button></aside><main><div class="cp18-canvas-wrap">Papel</div></main></div></section>
  <div class="merge-source-summary"><div class="merge-source-item">Arquivo</div></div>
  <div class="conversion-format-grid"><label><span><b>DOCX</b><small>Documento</small></span></label></div>
</body></html>"""


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.set_content(html, wait_until="domcontentloaded")
    values = page.evaluate("""() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const dark = selector => {
        const match = style(selector).backgroundColor.match(/\d+/g).map(Number);
        return Math.max(...match.slice(0, 3)) < 80;
      };
      const toolbar = document.querySelector('.pdf-editor-toolbar');
      return {
        toolbarPosition: style('.pdf-editor-toolbar').position,
        toolbarTop: style('.pdf-editor-toolbar').top,
        headerPosition: style('.editor-work-header').position,
        toolbarFits: toolbar.scrollWidth <= toolbar.clientWidth + 1,
        editorDark: dark('.pdf-editor-section'),
        editorToolbarDark: dark('.pdf-editor-toolbar'),
        editorButtonDark: dark('.editor-tool'),
        redactionDark: dark('.redaction-section'),
        redactionButtonDark: dark('.redaction-toolbar button'),
        formsDark: dark('.cp18-designer'),
        formsButtonDark: dark('.cp18-designer-toolbar button'),
        mergeDark: dark('.merge-source-summary'),
        conversionDark: dark('.conversion-format-grid span'),
        editorPaper: style('.editor-stage').backgroundColor,
        redactionPaper: style('#redactCanvasWrap').backgroundColor,
        formsPaper: style('.cp18-canvas-wrap').backgroundColor,
      };
    }""")

    assert values["toolbarPosition"] == "static"
    assert values["toolbarTop"] == "auto"
    assert values["headerPosition"] == "static"
    assert values["toolbarFits"] is True
    for key in (
        "editorDark", "editorToolbarDark", "editorButtonDark",
        "redactionDark", "redactionButtonDark", "formsDark",
        "formsButtonDark", "mergeDark", "conversionDark",
    ):
        assert values[key] is True, (key, values[key])
    assert values["editorPaper"] == "rgb(255, 255, 255)"
    assert values["redactionPaper"] == "rgb(255, 255, 255)"
    assert values["formsPaper"] == "rgb(255, 255, 255)"
    browser.close()

print("workspace-visual-fixes-1.2.2: passed")
