from pathlib import Path
root = Path(__file__).resolve().parents[1]
stable = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')
loader = (root/'assets/js/engine-loader.js').read_text(encoding='utf-8')
index = (root/'index.html').read_text(encoding='utf-8')
assert 'isResolvedLegacyPdfLog' in stable
assert "Failed to execute 'importScripts'" in stable
assert 'vendor\\/pdf' in stable or 'vendor/pdf' in stable
assert 'migrateResolvedLegacyLogs' in stable
assert "bundled[definition.key] && definition.local" in loader
assert 'vendor/offline-status.js' in index
assert index.index('vendor/offline-status.js') < index.index('assets/js/engine-loader.js')
assert 'direct-file-esm-unsupported' in loader
assert 'pdfJsEvalDisabled: true' in loader
assert 'options.workerSrc = sourceUrl' in loader
assert 'options.workerPort = workerPort' not in loader
assert 'pdfWorkerBlobWrapperDisabled: true' in loader
print('pdf-log-migration-1.2.0: passed')
