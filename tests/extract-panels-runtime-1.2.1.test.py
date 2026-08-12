from pathlib import Path


root = Path(__file__).resolve().parents[1]
app = (root / "assets/js/app.js").read_text(encoding="utf-8")
css = (root / "assets/css/product-redesign-2.0.css").read_text(encoding="utf-8")
index = (root / "index.html").read_text(encoding="utf-8")
service_worker = (root / "sw.js").read_text(encoding="utf-8")

definition = app.index("function updateExtractPanels()")
first_call = app.index("updateExtractPanels();")

assert definition > first_call
assert "document.querySelectorAll('[data-extract-panel]')" in app[definition:definition + 450]
assert "panel.dataset.extractPanel !== mode" in app[definition:definition + 450]
assert "await window.CentralPDFEnginesReady;" in app
assert "body[data-theme='dark']" in css
assert "--cp2-surface: #0e1625" in css
assert "top: 58px !important" in css
assert "product-redesign-2.0.css?v=2.0.4" in index
assert "assets/js/app.js?v=1.2.1-ui2" in index
assert "centralpdf-v1.2.1-pages-12" in service_worker

print("extract-panels-runtime-1.2.1: passed")
