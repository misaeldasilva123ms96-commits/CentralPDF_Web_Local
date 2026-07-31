from pathlib import Path
root=Path(__file__).resolve().parents[1]
index=(root/'index.html').read_text(encoding='utf-8')
loader=(root/'assets/js/engine-loader.js').read_text(encoding='utf-8')
status=(root/'vendor/offline-status.js').read_text(encoding='utf-8')
prepare=(root/'PREPARAR_OFFLINE.bat').read_text(encoding='utf-8')
prepare_script=(root/'scripts/prepare-offline.ps1').read_text(encoding='utf-8')
bat=(root/'ABRIR_CENTRAL_PDF.bat').read_text(encoding='utf-8')
sw=(root/'sw.js').read_text(encoding='utf-8')
server=(root/'server/main.go').read_text(encoding='utf-8')
assert index.index('vendor/offline-status.js') < index.index('assets/js/engine-loader.js')
assert 'prepared: false' in status
assert 'Boolean(offlineStatus.pdfJs)' in loader
assert 'scripts\\prepare-offline.ps1' in prepare
assert "'vendor/offline-status.js'" in prepare_script
assert 'prepared: true' in prepare_script
assert (root/'vendor/pdfjs-manifest.js').read_text(encoding='utf-8').strip() == 'self.CentralPDFPdfJsAssets = Object.freeze([]);'
assert "importScripts('./vendor/pdfjs-manifest.js')" in sw
assert 'self.CentralPDFPdfJsAssets || []' in sw
assert 'start "" "%~dp0index.html"' not in bat
assert 'http.server 8765' in bat
assert "endsWith('/vendor/offline-status.js')" in sw
assert 'vendor/offline-status.js' in server
print('offline-marker-1.1.3: passed')
