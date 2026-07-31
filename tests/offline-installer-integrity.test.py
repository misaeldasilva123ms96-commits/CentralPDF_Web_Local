from pathlib import Path
import re


root = Path(__file__).resolve().parents[1]
script = (root / 'scripts' / 'prepare-offline.ps1').read_text(encoding='utf-8')

assert script.count("Sha256 = '") == 15
assert script.count("https://") == 15
assert 'Get-FileHash -Algorithm SHA256' in script
assert 'Move-Item -LiteralPath $partial' in script
assert 'Remove-Item -LiteralPath $partial' in script
assert 'Reutilizando $($item.Path): SHA-256 válido.' in script
assert not re.search(r"Sha256 = '[^0-9a-f]", script)
assert "utif@3.1.0/UTIF.js" in script
assert "Path = 'vendor/UTIF.js'" in script
assert "utif@3.1.0/UTIF.min.js" not in script
assert "Path = 'vendor/UTIF.min.js'" not in script
assert 'tesseract-core-relaxedsimd.wasm.js' in script
assert 'tesseract-core-relaxedsimd-lstm.wasm.js' in script

print('offline-installer-integrity: passed')
