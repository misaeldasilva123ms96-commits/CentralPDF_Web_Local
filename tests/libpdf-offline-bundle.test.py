from pathlib import Path
import re


root = Path(__file__).resolve().parents[1]
bundle = root / 'vendor' / 'libpdf-core.mjs'
licenses = root / 'vendor' / 'libpdf-core.LICENSES.txt'
source = bundle.read_text(encoding='utf-8')

assert bundle.stat().st_size > 900_000, 'O LibPDF offline parece ser apenas um redirecionador.'
assert licenses.stat().st_size > 1_000, 'As licenças do bundle LibPDF não foram preservadas.'
assert not re.search(r'\b(?:from|import)\s*["\']/', source), 'O bundle contém imports absolutos externos.'
assert 'https://esm.sh/' not in source, 'O bundle offline ainda depende do esm.sh.'

print('libpdf-offline-bundle: passed')
