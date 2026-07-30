from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'assets/css/styles.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/ux-redesign.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/layout-controls.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/ocr-0.16.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/professional-0.17.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/forms-signatures-0.18.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/conversions-0.19.css').read_text(encoding='utf-8')+'\n'+(root/'assets/css/intelligence-0.20.css').read_text(encoding='utf-8')
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/n).read_text(encoding='utf-8') for n in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ocr-0.16.js','assets/js/compare-0.17.js','assets/js/redaction-0.17.js','assets/js/forms-signatures-0.18.js','assets/js/conversions-0.19.js','assets/js/intelligence-0.20.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html, wait_until='domcontentloaded')
 assert page.locator('.tool-card').count()==34
 page.fill('#toolSearch','dividir')
 page.wait_for_timeout(50)
 assert page.locator('.tool-card:not(.hidden)').count()==1
 assert '1 opção' in page.locator('#toolResultCount').inner_text()
 page.fill('#toolSearch','')
 page.locator('[data-tool="split"].tool-card').click()
 assert page.locator('#operationTitle').inner_text()=='Dividir PDF'
 assert page.locator('#uxCapability').inner_text()=='Criar partes por regra'
 assert page.locator('#toolGuideSteps li').count()==3
 assert page.locator('#settingsEmptyState:not(.hidden)').count()==1
 page.fill('#workspaceToolSearch','senha')
 assert page.locator('#workspaceToolNav .tool:not(.hidden)').count()==2
 page.fill('#workspaceToolSearch','')
 page.locator('#workspaceToolNav [data-tool="compress"]').click()
 assert page.locator('#settingsTitle').inner_text()=='Perfil de compressão'
 assert 'rasterizados' in page.locator('#toolAttentionText').inner_text()
 page.evaluate("window.CentralPDFUX.updateStage(2)")
 assert page.locator('#settingsContent:not(.hidden)').count()==1
 assert page.locator('#toolGuide').get_attribute('open') is None
 page.locator('#workspaceToolNav [data-tool="ocr"]').click()
 assert page.locator('#operationTitle').inner_text()=='OCR e PDF pesquisável'
 assert page.locator('#settingsTitle').inner_text()=='Reconhecimento e qualidade'
 assert 'pesquisável' in page.locator('#uxCapability').inner_text().lower()
 page.locator('#workspaceToolNav [data-tool="pdfToOffice"]').click()
 assert page.locator('#operationTitle').inner_text()=='PDF para Office'
 assert page.locator('#settingsTitle').inner_text()=='Formato e fidelidade'
 page.locator('#workspaceToolNav [data-tool="documentsToPdf"]').click()
 assert page.locator('#operationTitle').inner_text()=='Documentos para PDF'
 page.locator('#workspaceToolNav [data-tool="extractImages"]').click()
 assert page.locator('#operationTitle').inner_text()=='Extrair imagens do PDF'
 page.locator('#workspaceToolNav [data-tool="archivePdf"]').click()
 assert page.locator('#operationTitle').inner_text()=='Preparar para arquivamento'
 page.locator('#workspaceToolNav [data-tool="documentAssistant"]').click()
 assert page.locator('#operationTitle').inner_text()=='Assistente documental'
 assert page.locator('#settingsTitle').inner_text()=='Pergunta e foco da análise'
 page.locator('#workspaceToolNav [data-tool="structuredExtraction"]').click()
 assert page.locator('#operationTitle').inner_text()=='Extração estruturada'
 page.locator('#workspaceToolNav [data-tool="documentAudit"]').click()
 assert page.locator('#operationTitle').inner_text()=='Auditoria documental'
 page.locator('#workspaceToolNav [data-tool="classifyRename"]').click()
 assert page.locator('#operationTitle').inner_text()=='Classificar e renomear'
 page.locator('#workspaceToolNav [data-tool="compare"]').click()
 assert page.locator('#operationTitle').inner_text()=='Comparar PDFs'
 assert page.locator('#settingsTitle').inner_text()=='Critérios de comparação'
 page.locator('#workspaceToolNav [data-tool="redact"]').click()
 assert page.locator('#operationTitle').inner_text()=='Censura definitiva'
 assert page.locator('#redactionSection:not(.hidden)').count()==1
 page.locator('#workspaceToolNav [data-tool="formBuilder"]').click()
 assert page.locator('#operationTitle').inner_text()=='Criar formulário preenchível'
 assert page.locator('#formBuilderSection:not(.hidden)').count()==1
 page.locator('#workspaceToolNav [data-tool="signPdf"]').click()
 assert page.locator('#operationTitle').inner_text()=='Assinar e rubricar PDF'
 assert page.locator('#signatureSection:not(.hidden)').count()==1
 print('ux-interaction: passed')
 print('page-errors:', errors)
 b.close()
