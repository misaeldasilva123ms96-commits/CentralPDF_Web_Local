from pathlib import Path
import re


root = Path(__file__).resolve().parents[1]
script = (root / 'scripts' / 'prepare-offline.ps1').read_text(encoding='utf-8')

assert "$pdfJsVersion = '6.2.108'" in script
assert 'pdfjs-dist-$pdfJsVersion.tgz' in script
assert "Sha256 = 'b3e68d5cda70551a90b3f771419d379e20fc788ce056fa32de73608e01df47f4'" in script
assert "ApiSha256 = '9fab0c910bf1484835c5c2aeb68f7eb3dfce7f9eb435a004526c5af86d70890c'" in script
assert "WorkerSha256 = 'bc0d1b88ea0b66196b1d36a58ac243c6d92adfe725624e2a9fdd381bdf8ef434'" in script
assert "ResourcesSha256 = '960886d4e606e53b75909ea28efae08ff7f41011b1b8b09ed370f9c9087761be'" in script
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
