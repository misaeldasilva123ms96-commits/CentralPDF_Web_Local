from pathlib import Path
import re

app_path = Path('assets/js/app.js')
app = app_path.read_text(encoding='utf-8')
pattern = r"  async function rasterCompressPdfAdaptive\([^\n]*\) \{.*?(?=\n  async function compress\()"
replacement = r'''  async function rasterCompressPdfAdaptive(file, profile, scope, pageText, stripMetadata, fileIndex, fileTotal) {
    const configuredAttempts = profile.attempts?.length ? profile.attempts : [{
      dpi: profile.dpi || 72,
      quality: profile.quality || .42,
      minImageCoverage: profile.minImageCoverage ?? 0
    }];
    const analysis = await analyzeCompressionPages(file, scope, pageText, fileIndex, fileTotal);
    const largeDocument = analysis.numPages >= 250 || file.size >= 8 * 1024 * 1024;
    const attempts = largeDocument && profile.largeDocumentAttempt
      ? [profile.largeDocumentAttempt]
      : configuredAttempts;
    let bestCandidate = null;
    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
      const attempt = { ...attempts[attemptIndex], grayscale: Boolean(profile.grayscale) };
      const result = await rasterCompressPdfAdvanced(file, attempt, scope, pageText, stripMetadata, fileIndex, fileTotal, analysis);
      const candidate = {
        ...attempt,
        bytes: result.bytes,
        stats: result.stats,
        reduction: file.size ? 1 - result.bytes.byteLength / file.size : 0
      };
      if (!bestCandidate || candidate.bytes.byteLength < bestCandidate.bytes.byteLength) bestCandidate = candidate;
      if (!profile.adaptive || candidate.reduction >= (profile.targetReduction || 0)) return candidate;
    }
    return bestCandidate;
  }'''
app, count = re.subn(pattern, replacement.rstrip(), app, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f'Função adaptativa não substituída: {count}')
app_path.write_text(app, encoding='utf-8')

planner_path = Path('assets/js/advanced-planner.js')
planner = planner_path.read_text(encoding='utf-8')
planner = planner.replace(
    "rasterize: true, adaptive: true, targetReduction: .50, grayscale: false,\n      attempts:",
    "rasterize: true, adaptive: true, targetReduction: .48, grayscale: false,\n      largeDocumentAttempt: { dpi: 52, quality: .27, minImageCoverage: .008 },\n      attempts:",
    1
)
planner = planner.replace(
    "rasterize: true, adaptive: true, targetReduction: .62, grayscale: false,\n      attempts:",
    "rasterize: true, adaptive: true, targetReduction: .60, grayscale: false,\n      largeDocumentAttempt: { dpi: 46, quality: .22, minImageCoverage: .005 },\n      attempts:",
    1
)
planner = planner.replace(
    "{ dpi: 46, quality: .23, minImageCoverage: .003 }",
    "{ dpi: 46, quality: .22, minImageCoverage: .005 }",
    1
)
if 'largeDocumentAttempt: { dpi: 46' not in planner:
    raise RuntimeError('Ajuste de documento grande não aplicado ao planner.')
planner_path.write_text(planner, encoding='utf-8')

for path in [Path('tests/compression-worker-1.1.6.test.py'), Path('tests/smart-compression-integration.test.py')]:
    text = path.read_text(encoding='utf-8')
    text = text.replace("recommendedTarget'] == .50", "recommendedTarget'] == .48")
    text = text.replace("strongTarget'] == .62", "strongTarget'] == .60")
    text = text.replace("targetReduction: .50", "targetReduction: .48")
    text = text.replace("targetReduction: .62", "targetReduction: .60")
    text = text.replace("minImageCoverage: .003", "minImageCoverage: .005")
    path.write_text(text, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
needle = '- aplica limiares progressivos de cobertura visual e perfis adaptativos para documentos extensos;'
replacement_line = '- aplica limiares progressivos de cobertura visual e usa uma única passagem calibrada em documentos com 250+ páginas ou 8 MB+, evitando consumo excessivo de memória;'
if needle in changelog:
    changelog = changelog.replace(needle, replacement_line, 1)
changelog_path.write_text(changelog, encoding='utf-8')
