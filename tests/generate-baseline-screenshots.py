"""Captura os screenshots de baseline do CentralPDF v1.2.1 (Fase 0).

Gera docs/architecture/previews/BASELINE_*.png a partir do estado atual do
aplicativo vanilla. Deve ser executado em ambiente com Playwright instalado
(CI: pytest installs playwright). Uso:

    python tests/generate-baseline-screenshots.py

Saídas:
- docs/architecture/previews/BASELINE_HOME_v1.2.1.png  (home com tool cards)
- docs/architecture/previews/BASELINE_WORKSPACE_v1.2.1.png (workspace de juntar)
"""
from pathlib import Path
import re

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')

css_paths = [
    'assets/css/styles.css', 'assets/css/ux-redesign.css',
    'assets/css/layout-controls.css', 'assets/css/foundation.css',
    'assets/css/experience-0.15.css', 'assets/css/ocr-0.16.css',
    'assets/css/professional-0.17.css', 'assets/css/forms-signatures-0.18.css',
    'assets/css/conversions-0.19.css', 'assets/css/intelligence-0.20.css',
    'assets/css/stable-1.0.css', 'assets/css/header-settings-1.0.1.css',
    'assets/css/tool-cards-uniform-1.0.2.css', 'assets/css/theme-and-visual-1.0.3.css',
    'assets/css/dark-theme-polish-1.0.4.css', 'assets/css/home-dark-refine-1.0.5.css',
    'assets/css/dark-theme-audit-1.0.6.css', 'assets/css/settings-fit-1.0.7.css',
    'assets/css/dialog-audit-1.0.8.css', 'assets/css/modal-fit-1.0.9.css',
    'assets/css/micro-polish-1.1.0.css', 'assets/css/quality-logs-1.1.2.css',
    'assets/css/tool-quality-1.2.0.css', 'assets/css/workspace-visual-fixes-1.2.2.css',
]
script_paths = [
    'assets/js/engine-loader.js', 'vendor/jszip.min.js',
    'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
    'assets/js/compression-engine.js', 'assets/js/organizer-planner.js',
    'assets/js/pdf-editor.js', 'assets/js/ux-enhancements.js',
    'assets/js/ocr-0.16.js', 'assets/js/compare-0.17.js',
    'assets/js/redaction-0.17.js', 'assets/js/forms-signatures-0.18.js',
    'assets/js/conversions-0.19.js', 'assets/js/intelligence-0.20.js',
    'assets/js/app.js', 'assets/js/tool-quality-1.2.0.js',
    'assets/js/layout-controls.js', 'assets/js/foundation.js',
    'assets/js/experience-0.15.js', 'assets/js/stable-1.0.js',
    'assets/js/header-settings-1.0.3.js',
]

html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>', '', html)
html = re.sub(r'\s*<link rel="manifest" href="[^"]+"\s*/?>', '', html)
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)
css = '\n'.join((root / p).read_text(encoding='utf-8') for p in css_paths)
scripts = '\n'.join((root / p).read_text(encoding='utf-8') for p in script_paths)
html = (html.replace('</head>', f'<style>{css}</style></head>')
            .replace('</body>', f'<script>{scripts}</script></body>'))

out = root / 'docs/architecture/previews'
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(out / 'BASELINE_HOME_v1.2.1.png'), full_page=False)

    page.evaluate("window.CentralPDFApp && window.CentralPDFApp.selectTool('merge')")
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / 'BASELINE_WORKSPACE_v1.2.1.png'), full_page=False)
    browser.close()

print(f'Screenshots gerados em {out}')