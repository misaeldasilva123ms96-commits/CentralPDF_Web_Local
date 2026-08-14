from pathlib import Path
import re

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
soup = BeautifulSoup(index, "html.parser")
style_paths = [
    link.get("href", "").split("?", 1)[0]
    for link in soup.select('link[rel="stylesheet"]')
]
css = "\n".join(
    (root / path).read_text(encoding="utf-8")
    for path in style_paths
    if path.startswith("assets/css/")
)

assert len(soup.select(".sidebar .tool[data-tool]")) == 34
assert "product-redesign-2.0.css?v=2.0.9" in index
assert re.search(
    r"body\[data-workspace-open='true'\] \.settings-panel > \*\s*\{[^}]*flex-shrink:\s*0",
    css,
    re.S,
)

html = f"""<!doctype html><html><head><style>{css}</style></head>
<body data-theme="dark" data-workspace-open="true">
  <header class="topbar">Central PDF &amp; Imagem</header>
  <main class="workspace">
    <section class="main-panel">
      <div class="panel-heading"><h1>Ferramenta de teste</h1></div>
      <div style="height:1700px">Conteúdo principal longo</div>
    </section>
    <aside class="settings-panel">
      <div class="settings-heading"><div><span>Configuração</span><h2>Resumo da união</h2><p>Confira os documentos de origem, preserve metadados e escolha o nome final.</p></div></div>
      <div class="tool-attention"><span>!</span><div><strong>Ponto de atenção</strong><p>O aviso deve começar somente depois do texto de descrição.</p></div></div>
      <div id="settingsContent" style="height:900px">Opções</div>
      <div class="action-dock"><button class="primary-button">Gerar resultado</button></div>
    </aside>
  </main>
</body></html>"""


def panel_metrics(page):
    return page.evaluate("""() => {
      const panel = document.querySelector('.settings-panel');
      const main = document.querySelector('.main-panel');
      const rect = panel.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const description = document.querySelector('.settings-heading p').getBoundingClientRect();
      const attention = document.querySelector('.tool-attention').getBoundingClientRect();
      return {
        scrollY,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        mainRight: mainRect.right,
        viewportHeight: innerHeight,
        position: style.position,
        overflowY: style.overflowY,
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        headingFlexShrink: getComputedStyle(document.querySelector('.settings-heading')).flexShrink,
        contentFlexShrink: getComputedStyle(document.querySelector('#settingsContent')).flexShrink,
        descriptionToAttentionGap: attention.top - description.bottom,
      };
    }""")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    page = browser.new_page(viewport={"width": 1368, "height": 600})
    page.set_content(html, wait_until="domcontentloaded")

    before = panel_metrics(page)
    page.evaluate(
        """() => {
      const de = document.documentElement;
      de.style.scrollBehavior = 'auto';
      scrollTo(0, 900);
      de.style.scrollBehavior = '';
    }"""
    )
    after = panel_metrics(page)

    for values in (before, after):
        assert values["position"] == "fixed", values
        assert abs(values["top"] - 58) <= 1, values
        assert abs(values["bottom"] - values["viewportHeight"]) <= 1, values
        assert values["overflowY"] == "auto", values
        assert values["mainRight"] <= values["left"] + 1, values
        assert values["noHorizontalOverflow"] is True, values
        assert values["headingFlexShrink"] == "0", values
        assert values["contentFlexShrink"] == "0", values
        assert values["descriptionToAttentionGap"] >= 10, values

    assert after["scrollY"] >= 899, after
    assert abs(after["top"] - before["top"]) <= 1, (before, after)
    assert abs(after["bottom"] - before["bottom"]) <= 1, (before, after)
    assert page.locator(".settings-heading").evaluate("el => getComputedStyle(el).position") == "static"
    browser.close()

print("workspace-fixed-settings-2.0.5: passed")
