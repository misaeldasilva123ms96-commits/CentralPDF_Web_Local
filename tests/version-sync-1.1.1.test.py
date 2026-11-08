from pathlib import Path
root = Path(__file__).resolve().parents[1]
index = (root/'index.html').read_text(encoding='utf-8')
stable = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')
head1 = (root/'assets/js/header-settings-1.0.1.js').read_text(encoding='utf-8')
head3 = (root/'assets/js/header-settings-1.0.3.js').read_text(encoding='utf-8')
foundation = (root/'assets/js/foundation.js').read_text(encoding='utf-8')
engine_loader = (root/'assets/js/engine-loader.js').read_text(encoding='utf-8')
quality = (root/'assets/js/tool-quality-1.2.0.js').read_text(encoding='utf-8')
manifest = (root/'manifest.webmanifest').read_text(encoding='utf-8')
service_worker = (root/'sw.js').read_text(encoding='utf-8')
server = (root/'server/main.go').read_text(encoding='utf-8')
readme = (root/'README.md').read_text(encoding='utf-8')
assert 'Web local 3.0.0' in index
assert 'v3.0.0' in index
assert 'Central PDF — Web Local 3.0.0' in index
for snippet in [
    '3.0.0 estável',
    'Central 3.0.0: qualidade e acessibilidade',
    'Qualidade da versão 3.0.0',
    '<small>Versão</small><strong>${DISPLAY_VERSION}</strong>',
    'Web local ${DISPLAY_VERSION}',
    'v${DISPLAY_VERSION}',
    'Atalhos da versão 3.0.0',
]:
    assert snippet in stable, snippet
assert "qualityLabel.textContent = 'Qualidade 3.0.0';" in head1
assert "qualityLabel.textContent = 'Diagnóstico e erros';" in head3
assert "const APP_VERSION = '3.0.0';" in foundation
assert "const APP_VERSION = '3.0.0';" in engine_loader
assert "const VERSION = '3.0.0';" in quality
assert 'Central PDF 3.0.0' in manifest
assert "centralpdf-v3.0.0-pages-59" in service_worker
assert '"version":"3.0.0"' in server
assert readme.startswith('# Central PDF 3.0.0\n')
print('version-sync-3.0.0: passed')
