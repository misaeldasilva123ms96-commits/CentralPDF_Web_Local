from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')
planner = (root / 'assets/js/advanced-planner.js').read_text(encoding='utf-8')
engine = (root / 'assets/js/compression-engine.js').read_text(encoding='utf-8')
index = (root / 'index.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')

assert 'assets/js/compression-engine.js' in index
assert './assets/js/compression-engine.js' in sw
assert 'centralpdf-v1.2.1-pages-8' in sw
assert 'analyzeCompressionPages' in app
assert 'CentralPDFCompressionEngine.analyzePage' in app
assert 'CentralPDFCompressionEngine.shouldRasterizePage' in app
assert 'raster inteligente por conteúdo' in app
assert 'No modo Automático, o motor prioriza nitidez' in app
assert 'Automático — boa qualidade e boa redução' in app
assert 'minImageCoverage: .16' in planner
assert 'minImageCoverage: .005' in planner
assert 'targetReduction: .35' in planner
assert 'targetReduction: .60' in planner
assert 'preserveText: true' in planner
assert 'imageDominatedThreshold: .65' in planner
assert 'profile.preserveText && metrics.textOps > 0 && !imageDominated' in engine
print('smart-compression-integration: passed')
