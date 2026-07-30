from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
app=(ROOT/'assets/js/app.js').read_text(encoding='utf-8')
html=(ROOT/'index.html').read_text(encoding='utf-8')
compare=(ROOT/'assets/js/compare-0.17.js').read_text(encoding='utf-8')
redact=(ROOT/'assets/js/redaction-0.17.js').read_text(encoding='utf-8')
assert "compare: {" in app and "redact: {" in app
assert "CentralPDFCompare" in compare and "CentralPDFRedaction" in redact
assert 'data-tool="compare"' in html and 'data-tool="redact"' in html
assert '34 opções disponíveis' in html
assert 'sourceSha256' in redact and 'reconstructed:true' in redact
assert 'visualDiff' in compare and 'relatorio.html' in compare
print('professional-0.17: OK')
