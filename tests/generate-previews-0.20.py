from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css='\n'.join((root/p).read_text(encoding='utf-8') for p in [
'assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css','assets/css/experience-0.15.css','assets/css/ocr-0.16.css','assets/css/professional-0.17.css','assets/css/forms-signatures-0.18.css','assets/css/conversions-0.19.css','assets/css/intelligence-0.20.css'])
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/p).read_text(encoding='utf-8') for p in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ocr-0.16.js','assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js','assets/js/conversions-0.19.js','assets/js/intelligence-0.20.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')
out=root/'docs/previews/PREVIA_INTELIGENCIA_0.20.png'
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('.tool-card[data-tool="documentAssistant"]').click()
    page.evaluate('window.CentralPDFUX.updateStage(2)')
    page.fill('#intelligenceQuestion','Qual é a vigência, o valor total e a regra de reajuste do contrato?')
    page.select_option('#intelligenceFocus','contract')
    page.screenshot(path=str(out),full_page=False)
    b.close()
print(out)
