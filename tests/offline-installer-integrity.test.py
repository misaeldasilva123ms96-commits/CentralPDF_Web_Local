from pathlib import Path
import re


root = Path(__file__).resolve().parents[1]
script = (root / 'scripts' / 'prepare-offline.ps1').read_text(encoding='utf-8')

assert script.count("Sha256 = '") == 13
assert script.count("https://") == 13
assert 'Get-FileHash -Algorithm SHA256' in script
assert 'Move-Item -LiteralPath $partial' in script
assert 'Remove-Item -LiteralPath $partial' in script
assert not re.search(r"Sha256 = '[^0-9a-f]", script)

print('offline-installer-integrity: passed')
