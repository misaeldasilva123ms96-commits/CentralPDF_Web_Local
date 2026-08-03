from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = (root / 'index.html').read_text(encoding='utf-8')
editor = (root / 'assets/js/pdf-editor.js').read_text(encoding='utf-8')
service_worker = (root / 'sw.js').read_text(encoding='utf-8')

assert index.count('id="editorRotatePageLeft"') == 1
assert index.count('id="editorRotatePageRight"') == 1
assert "$('#editorRotatePageLeft')?.addEventListener('click', () => rotateCurrentPage(-90));" in editor
assert "$('#editorRotatePageRight')?.addEventListener('click', () => rotateCurrentPage(90));" in editor
assert 'sourceRotation = normalizeAngle(Number(page.rotate || 0))' in editor
assert 'getPageRenderRotation(page)' in editor
assert 'pageOrientation({ width: displayWidth, height: displayHeight })' in editor
assert "centralpdf-v1.2.1-pages-3" in service_worker
assert "url.pathname.endsWith('/assets/js/pdf-editor.js')" in service_worker
assert "fetch(request, { cache: 'no-store' })" in service_worker
print('editor-orientation-delivery: passed')
