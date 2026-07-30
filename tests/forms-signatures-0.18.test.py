from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
app=(root/'assets/js/app.js').read_text(encoding='utf-8')
module=(root/'assets/js/forms-signatures-0.18.js').read_text(encoding='utf-8')
css=(root/'assets/css/forms-signatures-0.18.css').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
assert soup.select_one('[data-tool="formBuilder"].tool-card')
assert soup.select_one('[data-tool="signPdf"].tool-card')
assert 'formBuilder: {' in app and 'signPdf: {' in app
assert 'CentralPDFForms' in module and 'CentralPDFSignatures' in module
assert 'createTextField' in module and 'createCheckBox' in module and 'createDropdown' in module
assert 'signaturePad' in app and 'signaturePrepare' in app
assert 'cp18-rotate-handle' in css and 'cp18-handle' in css
assert 'Assinatura visual' in app
print('forms-signatures-0.18: passed')
