from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label} não encontrado')
    return text.replace(old, new, 1)


index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
marker = '              <button id="editorMovePageDown" class="small-button" type="button">Página →</button>\n'
controls = (
    '              <button id="editorRotatePageLeft" class="small-button" type="button" '
    'title="Girar a página 90° para a esquerda">↶ Girar página</button>\n'
    '              <button id="editorRotatePageRight" class="small-button" type="button" '
    'title="Girar a página 90° para a direita">↷ Girar página</button>\n'
)
if 'id="editorRotatePageLeft"' not in index:
    index = replace_once(index, marker, marker + controls, 'Barra de ações da página')
index_path.write_text(index, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
sw = replace_once(
    sw,
    "const CACHE_VERSION = 'centralpdf-v1.2.1-pages-2';",
    "const CACHE_VERSION = 'centralpdf-v1.2.1-pages-3';",
    'Versão do cache',
)
old_same_origin = """  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
"""
new_same_origin = """  if (url.origin === self.location.origin) {
    const networkFirst = request.mode === 'navigate'
      || url.pathname.endsWith('/index.html')
      || url.pathname.endsWith('/assets/js/pdf-editor.js');

    if (networkFirst) {
      event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(request)));
      return;
    }

    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
"""
if 'const networkFirst = request.mode' not in sw:
    sw = replace_once(sw, old_same_origin, new_same_origin, 'Estratégia same-origin')
sw_path.write_text(sw, encoding='utf-8')

version_test = Path('tests/version-sync-1.1.1.test.py')
version_text = version_test.read_text(encoding='utf-8')
version_text = version_text.replace('centralpdf-v1.2.1-pages-2', 'centralpdf-v1.2.1-pages-3')
version_test.write_text(version_text, encoding='utf-8')

delivery_test = Path('tests/editor-orientation-delivery.test.py')
delivery_test.write_text("""from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = (root / 'index.html').read_text(encoding='utf-8')
editor = (root / 'assets/js/pdf-editor.js').read_text(encoding='utf-8')
service_worker = (root / 'sw.js').read_text(encoding='utf-8')

assert index.count('id=\"editorRotatePageLeft\"') == 1
assert index.count('id=\"editorRotatePageRight\"') == 1
assert "$('#editorRotatePageLeft')?.addEventListener('click', () => rotateCurrentPage(-90));" in editor
assert "$('#editorRotatePageRight')?.addEventListener('click', () => rotateCurrentPage(90));" in editor
assert 'sourceRotation = normalizeAngle(Number(page.rotate || 0))' in editor
assert 'getPageRenderRotation(page)' in editor
assert 'pageOrientation({ width: displayWidth, height: displayHeight })' in editor
assert "centralpdf-v1.2.1-pages-3" in service_worker
assert "url.pathname.endsWith('/assets/js/pdf-editor.js')" in service_worker
assert "fetch(request, { cache: 'no-store' })" in service_worker
print('editor-orientation-delivery: passed')
""", encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
entry = """## Correção de entrega da orientação do Editor PDF

- exibe os botões de rotação diretamente na barra de ações da página;
- renova o cache do aplicativo para entregar a implementação mesclada no PR #12;
- usa estratégia network-first para a página inicial e o módulo do Editor PDF, mantendo fallback offline;
- adiciona teste de regressão para controles, orientação e invalidação de cache.

"""
if entry not in changelog:
    changelog_path.write_text(entry + changelog, encoding='utf-8')
