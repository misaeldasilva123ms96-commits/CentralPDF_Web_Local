from pathlib import Path

from bs4 import BeautifulSoup


root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
app = (root / "assets/js/app.js").read_text(encoding="utf-8")
css = (root / "assets/css/split-interactive.css").read_text(encoding="utf-8")
sw = (root / "sw.js").read_text(encoding="utf-8")
soup = BeautifulSoup(index, "html.parser")


section = soup.select_one("#splitVisualSection")
assert section is not None
assert section.select_one("#splitVisualGroups") is not None
assert section.select_one("#splitVisualFileCount") is not None
assert "assets/css/split-interactive.css?v=2.0.1-split1" in [
    link.get("href", "") for link in soup.select('link[rel="stylesheet"]')
]

for contract in (
    'data-split-mode-choice="custom"',
    'data-split-mode-choice="fixedSize"',
    'data-split-mode-choice="everyPage"',
    'id="splitIntervalRows"',
    'id="splitAddInterval"',
    "function setupSplitInteractiveControls()",
    "function renderSplitVisualPlan(groups, errorMessage = '')",
    "function populateSplitVisualThumbnails(token, groups)",
):
    assert contract in app

for selector in (
    ".split-mode-selector",
    ".split-interval-row",
    ".split-visual-group",
    ".split-page-paper",
    "body[data-theme=\"dark\"] .split-visual-section",
    "@media (max-width: 430px)",
    "@media (prefers-reduced-motion: reduce)",
):
    assert selector in css

assert "./assets/css/split-interactive.css?v=2.0.1-split1" in sw
assert "centralpdf-v2.0.1-pages-21" in sw

print("split-interactive-ui: passed")
