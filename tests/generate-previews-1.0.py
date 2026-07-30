from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_paths=['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css','assets/css/experience-0.15.css','assets/css/ocr-0.16.css','assets/css/professional-0.17.css','assets/css/forms-signatures-0.18.css','assets/css/conversions-0.19.css','assets/css/intelligence-0.20.css','assets/css/stable-1.0.css']
script_paths=['assets/js/engine-loader.js','vendor/jszip.min.js','assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/ocr-0.16.js','assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js','assets/js/conversions-0.19.js','assets/js/intelligence-0.20.js','assets/js/app.js','assets/js/layout-controls.js','assets/js/foundation.js','assets/js/experience-0.15.js','assets/js/stable-1.0.js']
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<link rel="manifest" href="[^"]+"\s*/?>','',html)
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
css='\n'.join((root/p).read_text(encoding='utf-8') for p in css_paths)
scripts='\n'.join((root/p).read_text(encoding='utf-8') for p in script_paths)
html=html.replace('</head>',f'<style>{css}</style></head>').replace('</body>',f'<script>{scripts}</script></body>')
out=root/'docs/previews';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(900)
 page.screenshot(path=str(out/'PREVIA_HOME_1.0.png'),full_page=False)
 page.keyboard.press('Alt+a');page.wait_for_timeout(120)
 page.screenshot(path=str(out/'PREVIA_ACESSIBILIDADE_1.0.png'),full_page=False)
 page.locator('[data-close="cp10Accessibility"]').last.click();page.locator('#cp10QualityButton').click();page.wait_for_timeout(150)
 page.screenshot(path=str(out/'PREVIA_QUALIDADE_1.0.png'),full_page=False)
 b.close()
