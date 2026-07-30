from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_paths=[
 'assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css',
 'assets/css/experience-0.15.css','assets/css/ocr-0.16.css','assets/css/professional-0.17.css',
 'assets/css/forms-signatures-0.18.css','assets/css/conversions-0.19.css','assets/css/intelligence-0.20.css','assets/css/stable-1.0.css'
]
script_paths=[
 'assets/js/engine-loader.js','vendor/jszip.min.js','assets/js/split-planner.js','assets/js/advanced-planner.js',
 'assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/ocr-0.16.js',
 'assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js',
 'assets/js/conversions-0.19.js','assets/js/intelligence-0.20.js','assets/js/app.js','assets/js/layout-controls.js',
 'assets/js/foundation.js','assets/js/experience-0.15.js','assets/js/stable-1.0.js'
]
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<link rel="manifest" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
css='\n'.join((root/p).read_text(encoding='utf-8') for p in css_paths)
scripts='\n'.join((root/p).read_text(encoding='utf-8') for p in script_paths)
html=html.replace('</head>',f'<style>{css}</style></head>').replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_timeout(900)
    assert 'Web local 1.0' in page.locator('.brand-copy small').inner_text()
    assert page.locator('.cp10-stable-badge').count()==1
    assert page.locator('.tool-card[data-tool]').count()==34
    assert '34' in page.locator('.hero-stats').inner_text()
    assert page.locator('#cp10QualityButton').count()==1

    page.keyboard.press('Alt+a')
    assert page.locator('#cp10Accessibility').get_attribute('open') is not None
    page.locator('#cp10-largeText').check()
    assert page.locator('body').evaluate("e=>e.classList.contains('cp10-large-text')")
    page.locator('[data-close="cp10Accessibility"]').last.click()

    page.keyboard.press('Alt+q')
    page.wait_for_timeout(100)
    assert page.locator('#cp10Quality').get_attribute('open') is not None
    assert '34' in page.locator('#cp10QualityContent').inner_text()
    assert 'Acessibilidade 1.0' in page.locator('#cp10QualityContent').inner_text()
    page.locator('[data-close="cp10Quality"]').click()

    first=page.locator('.tool-card:not(.hidden)').first
    first.focus()
    page.keyboard.press('ArrowRight')
    focused=page.evaluate('document.activeElement && document.activeElement.dataset.tool')
    assert focused is not None
    assert errors==[], errors
    print('stable-release-1.0: passed')
    browser.close()
