from pathlib import Path
import re


root = Path(__file__).resolve().parents[1]
script = (root / 'scripts' / 'prepare-offline.ps1').read_text(encoding='utf-8')

assert "$pdfJsVersion = '6.5.438'" in script
assert 'pdfjs-dist-$pdfJsVersion.tgz' in script
assert "Sha256 = '7461aefcd27c4ef0dd76f9ca5760f09466eb6b3f934432670c12132e7b3d6faa'" in script
assert "ApiSha256 = '522ad2c83bc8a0010e7f0cc60d0892b77c8d2bf2c9702dc12288311d94270f42'" in script
assert "WorkerSha256 = 'b4c8353ded0d88d2e2009574a29eb4e0c3ff7e942ecdf51ef5f71566a9667f31'" in script
assert "ResourcesSha256 = '8b4e60b576a8105db24c6ac5cbaf39de1ba2a8b7d8cf355306f5ed6d29422740'" in script
assert 'Get-PdfJsResourceDigest' in script
assert 'Get-FileHash -Algorithm SHA256' in script
assert 'Move-Item -LiteralPath $partial' in script
assert 'Remove-Item -LiteralPath $partial' in script
assert 'Reutilizando $($item.Path): SHA-256 válido.' in script
assert not re.search(r"(?:^|\s)Sha256 = '[^0-9a-f]", script)
assert "legacy/build/pdf.min.mjs" in script
assert "legacy/build/pdf.worker.min.mjs" in script
for directory in ('cmaps', 'iccs', 'standard_fonts', 'wasm'):
    assert f"'{directory}'" in script
assert "vendor/pdfjs-manifest.js" in script
assert "pdfJsVersion: '$pdfJsVersion'" in script
assert 'pdf.js/3.11.174' not in script
assert "utif@3.1.0/UTIF.js" in script
assert "Path = 'vendor/UTIF.js'" in script
assert "utif@3.1.0/UTIF.min.js" not in script
assert "Path = 'vendor/UTIF.min.js'" not in script
assert 'tesseract-core-relaxedsimd.wasm.js' in script
assert 'tesseract-core-relaxedsimd-lstm.wasm.js' in script

print('offline-installer-integrity: passed')
