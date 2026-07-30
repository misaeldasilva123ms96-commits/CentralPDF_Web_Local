from pathlib import Path
root=Path(__file__).resolve().parents[1]
engine=(root/'assets/js/engine-loader.js').read_text(encoding='utf-8')
app=(root/'assets/js/app.js').read_text(encoding='utf-8')
ocr=(root/'assets/js/ocr-0.16.js').read_text(encoding='utf-8')
editor=(root/'assets/js/pdf-editor.js').read_text(encoding='utf-8')
conv=(root/'assets/js/conversions-0.19.js').read_text(encoding='utf-8')
assert 'CentralPDFResolvePdfWorker' in engine
for text in [app,ocr,editor,conv]:
    assert 'CentralPDFResolvePdfWorker' in text
assert 'URL.createObjectURL(new Blob([source]' not in app
assert 'URL.createObjectURL(new Blob([source]' not in ocr
assert 'URL.createObjectURL(new Blob([source]' not in editor
print('pdf-worker-routing-1.1.2: passed')
