from pathlib import Path
from bs4 import BeautifulSoup


root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "html.parser")

# O redesign deve envolver a aplicação publicada, sem substituir o catálogo real.
assert len(soup.select(".tool-card[data-tool]")) == 34
assert len(soup.select(".sidebar .tool[data-tool]")) == 34

styles = [link.get("href", "").split("?", 1)[0] for link in soup.select('link[rel="stylesheet"]')]
scripts = [script.get("src", "").split("?", 1)[0] for script in soup.select("script[src]")]
assert "assets/css/product-redesign-2.0.css" in styles
assert "assets/js/product-redesign-2.0.js" in scripts

nav = soup.select_one("#primaryProductNav")
assert nav is not None
assert {button.get("data-nav-tool") for button in nav.select("[data-nav-tool]")} >= {
    "merge", "split", "compress", "organize", "editPdf"
}
assert soup.select_one("#allToolsMenuButton") is not None
assert soup.select_one("#allToolsMenuToggle") is not None
assert soup.select_one("#workspaceLayoutActions #focusModeButton") is None
assert soup.select_one("#workspaceLayoutActions #layoutSettingsButton") is None
assert soup.select_one(".workspace > #settingsPanelToggleTop") is not None
assert soup.select_one("#allToolsMegaMenu") is not None

# Os formulários ricos continuam sendo a fonte de configurações do workspace.
app = (root / "assets/js/app.js").read_text(encoding="utf-8")
for setting_id in (
    "splitMode", "compressionMode", "ocrOutputMode", "officeExportFormat",
    "editorTextValue", "watermarkType", "protectPassword"
):
    assert setting_id in app, setting_id

redesign = (root / "assets/js/product-redesign-2.0.js").read_text(encoding="utf-8")
header_settings = (root / "assets/js/header-settings-1.0.3.js").read_text(encoding="utf-8")
assert "tool-card[data-tool]" in redesign
assert "workspaceToolNav" in redesign
assert "34 ferramentas" in redesign
assert "group('Interface', ['layoutSettingsButton'])" in header_settings

print("product-redesign-functional-parity-2.0: passed")
