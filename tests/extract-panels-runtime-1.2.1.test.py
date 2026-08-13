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
assert "@media (min-width: 981px)" in css
assert "--cp2-inspector-width: max(318px, 25vw)" in css
assert "grid-template-columns: minmax(0, 1fr) var(--cp2-inspector-width)" in css
assert "position: fixed" in css
assert "inset: 58px 0 0 auto" in css
assert "width: var(--cp2-inspector-width)" in css
assert "overscroll-behavior: contain" in css
assert "product-redesign-2.0.css?v=2.0.5" in index
assert "assets/js/forms-signatures-0.18.js?v=0.18.1" in index
assert "assets/js/app.js?v=1.2.1-ui3" in index
assert "./assets/js/forms-signatures-0.18.js?v=0.18.1" in service_worker
assert "./assets/js/app.js?v=1.2.1-ui3" in service_worker
assert "./assets/css/product-redesign-2.0.css?v=2.0.5" in service_worker
assert "centralpdf-v1.2.1-pages-14" in service_worker

print("extract-panels-runtime-1.2.1: passed")
