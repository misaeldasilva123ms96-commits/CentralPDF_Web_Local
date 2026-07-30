from pathlib import Path
root = Path(__file__).resolve().parents[1]
index = (root/'index.html').read_text(encoding='utf-8')
stable = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')
head1 = (root/'assets/js/header-settings-1.0.1.js').read_text(encoding='utf-8')
head3 = (root/'assets/js/header-settings-1.0.3.js').read_text(encoding='utf-8')
foundation = (root/'assets/js/foundation.js').read_text(encoding='utf-8')
assert 'Web local 1.2.0' in index
assert 'v1.2.0' in index
assert 'Central PDF & Imagem — Web Local 1.2.0' in index
for snippet in [
    '1.2.0 estável',
    'Central 1.2.0: qualidade e acessibilidade',
    'Qualidade da versão 1.2.0',
    '<small>Versão</small><strong>${DISPLAY_VERSION}</strong>',
    'Web local ${DISPLAY_VERSION}',
    'v${DISPLAY_VERSION}',
    'Atalhos da versão 1.2.0',
]:
    assert snippet in stable, snippet
assert "qualityLabel.textContent = 'Qualidade 1.2.0';" in head1
assert "qualityLabel.textContent = 'Qualidade 1.2.0';" in head3
assert "const APP_VERSION = '1.2.0';" in foundation
print('version-sync-1.1.2: passed')
