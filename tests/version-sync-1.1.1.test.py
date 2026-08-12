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
assert 'Web local 1.2.1' in index
assert 'v1.2.1' in index
assert 'Central PDF & Imagem — Web Local 1.2.1' in index
for snippet in [
    '1.2.1 estável',
    'Central 1.2.1: qualidade e acessibilidade',
    'Qualidade da versão 1.2.1',
    '<small>Versão</small><strong>${DISPLAY_VERSION}</strong>',
    'Web local ${DISPLAY_VERSION}',
    'v${DISPLAY_VERSION}',
    'Atalhos da versão 1.2.1',
]:
    assert snippet in stable, snippet
assert "qualityLabel.textContent = 'Qualidade 1.2.1';" in head1
assert "qualityLabel.textContent = 'Qualidade 1.2.1';" in head3
assert "const APP_VERSION = '1.2.1';" in foundation
assert "const APP_VERSION = '1.2.1';" in engine_loader
assert "const VERSION = '1.2.1';" in quality
assert 'Central PDF & Imagem 1.2.1' in manifest
assert "centralpdf-v1.2.1-pages-10" in service_worker
assert '"version":"1.2.1"' in server
assert readme.startswith('# Central PDF & Imagem 1.2.1\n')
print('version-sync-1.2.1: passed')
