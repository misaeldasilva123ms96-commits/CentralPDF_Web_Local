from pathlib import Path
from bs4 import BeautifulSoup
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
app=(root/'assets/js/app.js').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
assert len(soup.select('.tool-card[data-tool]')) == 34
assert len(soup.select('.sidebar .tool[data-tool]')) == 34
scripts=[tag.get('src').split('?', 1)[0] if tag.get('src') else None for tag in soup.find_all('script')]
assert scripts.index('assets/js/advanced-planner.js') < scripts.index('assets/js/app.js')
assert scripts.index('assets/js/pdf-editor.js') < scripts.index('assets/js/app.js')
assert scripts.index('assets/js/ocr-0.16.js') < scripts.index('assets/js/app.js')
assert scripts.index('assets/js/forms-signatures-0.18.js') < scripts.index('assets/js/conversions-0.19.js') < scripts.index('assets/js/intelligence-0.20.js') < scripts.index('assets/js/app.js')
assert scripts.index('assets/js/app.js') < scripts.index('assets/js/tool-quality-1.2.0.js') < scripts.index('assets/js/layout-controls.js')
assert scripts.index('assets/js/experience-0.15.js') < scripts.index('assets/js/stable-1.0.js')
modules=['merge','split','extract','rotate','watermark','pageNumbers','imagesToPdf','imageConvert','compress','pdfToImage','crop','metadata','normalize','pdfToText','ocr','compare','redact','formBuilder','signPdf','pdfToOffice','documentsToPdf','extractImages','archivePdf','documentAssistant','structuredExtraction','documentAudit','classifyRename','protect','unlock','diagnose','repairAdvanced','flattenForms','organize','editPdf']
for name in modules:
    assert re.search(rf'^    {re.escape(name)}: \{{',app,re.M), name
for fn in ['merge','extract','rotate','watermark','pageNumbers','imagesToPdf','compress','pdfToImage','crop']:
    assert len(re.findall(rf'async function {fn}\(',app)) == 1, fn
required_layout_ids=['sidebarToggleTop','sidebarCollapseButton','settingsPanelToggleTop','focusModeButton','layoutSettingsButton','layoutSettingsDialog','sidebarBackdrop']
for item in required_layout_ids:
    assert soup.select_one(f'#{item}') is not None, item
assert (root/'assets/js/layout-controls.js').exists()
assert (root/'assets/css/layout-controls.css').exists()
assert (root/'assets/js/stable-1.0.js').exists()
assert (root/'assets/css/stable-1.0.css').exists()
assert (root/'assets/js/tool-quality-1.2.0.js').exists()
assert (root/'assets/css/tool-quality-1.2.0.css').exists()
assert 'Web local ' in html
assert '<strong>34</strong> ferramentas' in html
required_ids=['editorObjectX','editorObjectY','editorObjectRotation','editorRotateLeft','editorRotateRight','editorResetRotation','editorObjectLockAspect','editorBringForward','editorSendBackward','editorDuplicateObject','pdfEditorSection','editorTextValue','editorFontFamily','editorBrushColor','editorHighlightColor','editorApplyCrop','mergePlanPreview','extractMode','extractPlanPreview','rotateMode','rotateBehavior','watermarkType','watermarkPattern','numberScope','numberTotalMode','imageOutputMode','imageFit','compressionMode','compressionScope','pdfImageOutputMode','pdfImageColumns','cropMode','cropBehavior','ocrOutputMode','ocrLanguage','ocrDpi','ocrPlan','ocrReviewButton','formFieldType','formStartPlacement','signatureSource','signaturePad','signaturePrepare','officeExportFormat','docToPdfCombine','extractImageMode','archiveMode','intelligenceQuestion','extractionProfile','auditProfile','renameTemplate']
for item in required_ids:
    assert item in app, item
assert 'mergeComposerMode' not in app
assert 'mergeRulesPanel' not in app
print('static-integrity: passed')
