from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_files=['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css','assets/css/experience-0.15.css','assets/css/ocr-0.16.css','assets/css/professional-0.17.css','assets/css/forms-signatures-0.18.css','assets/css/conversions-0.19.css']
css='\n'.join((root/f).read_text(encoding='utf-8') for f in css_files)
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts=['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ocr-0.16.js','assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js','assets/js/conversions-0.19.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js']
code='\n'.join((root/f).read_text(encoding='utf-8') for f in scripts)
html=html.replace('</body>',f'<script>{code}</script></body>')
with sync_playwright() as p:
    b=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=b.new_page(viewport={'width':1600,'height':1000}, device_scale_factor=1)
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    for tool,name in [('pdfToOffice','PREVIA_PDF_PARA_OFFICE_0.19.png'),('documentsToPdf','PREVIA_DOCUMENTOS_PARA_PDF_0.19.png'),('extractImages','PREVIA_EXTRAIR_IMAGENS_0.19.png'),('archivePdf','PREVIA_ARQUIVAMENTO_0.19.png')]:
        page.evaluate(f"window.CentralPDFApp.selectTool('{tool}'); window.CentralPDFUX.updateStage(2)")
        page.wait_for_timeout(120)
        page.screenshot(path=str(root/'docs/previews'/name),full_page=True)
    assert not errors,errors
    print('previews-0.19: generated')
    b.close()
