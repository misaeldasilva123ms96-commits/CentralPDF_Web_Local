from pathlib import Path
from playwright.sync_api import sync_playwright
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_paths=['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css','assets/css/experience-0.15.css','assets/css/stable-1.0.css','assets/css/theme-and-visual-1.0.3.css','assets/css/dark-theme-polish-1.0.4.css','assets/css/dialog-audit-1.0.8.css','assets/css/modal-fit-1.0.9.css','assets/css/quality-logs-1.1.2.css']
script_paths=['assets/js/engine-loader.js','vendor/jszip.min.js','assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/ocr-0.16.js','assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js','assets/js/conversions-0.19.js','assets/js/intelligence-0.20.js','assets/js/app.js','assets/js/layout-controls.js','assets/js/foundation.js','assets/js/experience-0.15.js','assets/js/stable-1.0.js']
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<link rel="manifest" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
css='\n'.join((root/p).read_text(encoding='utf-8') for p in css_paths)
scripts='\n'.join((root/p).read_text(encoding='utf-8') for p in script_paths)
html=html.replace('</head>',f'<style>{css}</style></head>').replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_timeout(700)
    assert page.evaluate('window.CentralPDFStable.maxLogs')==250
    for _ in range(3):
        page.evaluate("window.CentralPDFStable.addLog('javascript','Falha repetida de teste','teste.js')")
    page.evaluate("window.CentralPDFStable.addLog('recurso','Falha de recurso de teste','arquivo.js')")
    stats=page.evaluate('window.CentralPDFStable.getLogStats()')
    assert stats['total']>=4
    logs=page.evaluate('window.CentralPDFStable.getErrors()')
    repeated=next(x for x in logs if x['message']=='Falha repetida de teste')
    assert repeated['count']==3
    page.keyboard.press('Alt+q')
    page.wait_for_timeout(120)
    assert page.locator('#cp10LogSearch').count()==1
    assert page.locator('#cp10LogFilter').count()==1
    assert page.locator('#cp10DownloadLogs').count()==1
    assert '250' in page.locator('#cp10LogCapacity').inner_text()
    assert '3×' in page.locator('#cp10ErrorList').inner_text()
    page.locator('#cp10LogSearch').fill('recurso')
    assert 'Falha de recurso de teste' in page.locator('#cp10ErrorList').inner_text()
    report=page.evaluate('window.CentralPDFStable.runCheck()')
    assert report['version']=='1.2.1'
    assert report['diagnosticModuleVersion']=='3.0.0'
    assert report['reportSchema']=='3.0'
    assert report['logStats']['capacity']==250
    print('quality-logs-1.1.2: passed')
    browser.close()
