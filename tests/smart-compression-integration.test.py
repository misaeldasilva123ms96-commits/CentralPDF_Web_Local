from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')
planner = (root / 'assets/js/advanced-planner.js').read_text(encoding='utf-8')
index = (root / 'index.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')

assert 'assets/js/compression-engine.js' in index
assert './assets/js/compression-engine.js' in sw
assert 'centralpdf-v1.2.1-pages-5' in sw
assert 'analyzeCompressionPages' in app
assert 'CentralPDFCompressionEngine.analyzePage' in app
assert 'CentralPDFCompressionEngine.shouldRasterizePage' in app
assert 'raster inteligente por conteúdo' in app
assert 'Páginas apenas com texto e vetores permanecem nativas' in app
assert 'minImageCoverage: .05' in planner
assert 'minImageCoverage: .003' in planner
assert 'targetReduction: .50' in planner
assert 'targetReduction: .62' in planner
print('smart-compression-integration: passed')
