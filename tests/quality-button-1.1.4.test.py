from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
script = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')
css = (root/'assets/css/stable-1.0.css').read_text(encoding='utf-8')
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body data-theme="dark">
<a id="homeBrand"></a><div class="brand-copy"><strong>Central PDF & Imagem</strong><small></small></div>
<div class="top-actions"><button id="helpButton">Ajuda</button></div>
<div id="toolGrid"></div><div id="statusBox"></div><footer><span></span></footer><div class="sidebar-footer-status"><small></small></div>
<script>{script}</script></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 1100, 'height': 760})
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_timeout(150)
    assert page.locator('#cp10RunCheck').count() == 1
    page.locator('#cp10QualityButton').click()
    page.wait_for_timeout(250)
    assert page.locator('#cp10Quality').evaluate('d => d.open') is True
    assert 'Última verificação:' in page.locator('#cp10LastCheck').inner_text()
    page.wait_for_timeout(1250)
    page.locator('#cp10QualityContent').evaluate("el => el.innerHTML='<div id=qualitySentinel>SENTINEL</div>'")
    page.locator('#cp10RunCheck').click()
    page.wait_for_timeout(250)
    assert page.locator('#qualitySentinel').count() == 0
    assert 'VERSÃO' in page.locator('#cp10QualityContent').inner_text()
    assert 'Última verificação:' in page.locator('#cp10LastCheck').inner_text()
    assert page.locator('#cp10RunCheck').get_attribute('aria-busy') is None
    report = page.evaluate('window.CentralPDFStable.runCheck()')
    assert report['version'] == '2.0.1'
    assert report['diagnosticModuleVersion'] == '3.0.0'
    print('quality-button-2.0.1: passed')
    browser.close()
