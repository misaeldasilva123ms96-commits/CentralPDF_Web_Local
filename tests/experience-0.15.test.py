from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
js=(root/'assets/js/experience-0.15.js').read_text(encoding='utf-8')
css=(root/'assets/css/experience-0.15.css').read_text(encoding='utf-8')
assert 'experience-0.15.js' in html and 'experience-0.15.css' in html
for token in ['Digitalizar e proteger','ocr','Resultados da sessão','Fluxos de trabalho','Predefinições','shouldHoldResult','openFilesInTool']:
    assert token in js, token
for path in ['assets/js/app.js','assets/css/styles.css','docs/reports','docs/testing','tests']:
    assert (root/path).exists(), path
assert not list(root.glob('RELATORIO_DE_TESTES_*.txt'))
assert not list(root.glob('TESTES*.md'))
assert not list(root.glob('CHANGELOG_*.txt'))
print('experience-0.15: passed')
