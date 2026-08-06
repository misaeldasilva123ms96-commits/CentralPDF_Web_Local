from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label} não encontrado')
    return text.replace(old, new, 1)

planner_path = Path('assets/js/advanced-planner.js')
planner = planner_path.read_text(encoding='utf-8')
old_recommended = """    if (mode === 'recommended') return {
      rasterize: true, adaptive: true, targetReduction: .48, grayscale: false,
      largeDocumentAttempt: { dpi: 52, quality: .27, minImageCoverage: .008 },
      attempts: [
        { dpi: 78, quality: .48, minImageCoverage: .05 },
        { dpi: 64, quality: .36, minImageCoverage: .02 },
        { dpi: 56, quality: .30, minImageCoverage: .01 }
      ]
    };
"""
new_recommended = """    if (mode === 'recommended') return {
      rasterize: true, adaptive: true, targetReduction: .35, grayscale: false,
      qualityPriority: true,
      largeDocumentAttempt: { dpi: 96, quality: .62, minImageCoverage: .08, preserveText: true, imageDominatedThreshold: .65 },
      attempts: [
        { dpi: 120, quality: .72, minImageCoverage: .16, preserveText: true, imageDominatedThreshold: .65 },
        { dpi: 108, quality: .66, minImageCoverage: .11, preserveText: true, imageDominatedThreshold: .65 },
        { dpi: 96, quality: .60, minImageCoverage: .07, preserveText: true, imageDominatedThreshold: .65 }
      ]
    };
"""
planner = replace_once(planner, old_recommended, new_recommended, 'Perfil automático')
planner = planner.replace("Number(custom.dpi || 96)", "Number(custom.dpi || 120)")
planner = planner.replace("Number(custom.quality || 52)", "Number(custom.quality || 68)")
planner_path.write_text(planner, encoding='utf-8')

engine_path = Path('assets/js/compression-engine.js')
engine = engine_path.read_text(encoding='utf-8')
old_result = """    const safePageArea = Math.max(1, finite(pageArea, 1));
    return {
      imageCount,
      textOps,
      vectorOps,
      imageCoverage: Math.min(1, imageArea / safePageArea),
      maxImageCoverage: Math.min(1, maxImageArea / safePageArea),
      imageArea,
      pageArea: safePageArea,
      likelyScanned: imageCount > 0 && textOps === 0 && maxImageArea / safePageArea >= 0.18
    };
"""
new_result = """    const safePageArea = Math.max(1, finite(pageArea, 1));
    const imageCoverage = Math.min(1, imageArea / safePageArea);
    const maxImageCoverage = Math.min(1, maxImageArea / safePageArea);
    const imageDominated = imageCount > 0 && maxImageCoverage >= .65;
    return {
      imageCount,
      textOps,
      vectorOps,
      imageCoverage,
      maxImageCoverage,
      imageArea,
      pageArea: safePageArea,
      imageDominated,
      likelyScanned: imageCount > 0 && (imageDominated || (textOps === 0 && maxImageCoverage >= .18))
    };
"""
engine = replace_once(engine, old_result, new_result, 'Métricas de conteúdo')
old_decision = """  function shouldRasterizePage(metrics, profile = {}) {
    if (!metrics || metrics.imageCount < 1) return false;
    if (metrics.likelyScanned) return true;
    const threshold = Math.max(0, finite(profile.minImageCoverage, 0));
    if (metrics.maxImageCoverage >= threshold) return true;
    if (metrics.imageCoverage >= threshold * 1.35) return true;
    const manyImagesThreshold = Math.max(0.004, threshold * 0.7);
    return metrics.imageCount >= 4 && metrics.imageCoverage >= manyImagesThreshold;
  }
"""
new_decision = """  function shouldRasterizePage(metrics, profile = {}) {
    if (!metrics || metrics.imageCount < 1) return false;
    const dominatedThreshold = Math.max(.2, finite(profile.imageDominatedThreshold, .65));
    const imageDominated = Boolean(metrics.imageDominated || metrics.maxImageCoverage >= dominatedThreshold);
    if (profile.preserveText && metrics.textOps > 0 && !imageDominated) return false;
    if (metrics.likelyScanned || imageDominated) return true;
    const threshold = Math.max(0, finite(profile.minImageCoverage, 0));
    if (metrics.maxImageCoverage >= threshold) return true;
    if (metrics.imageCoverage >= threshold * 1.35) return true;
    const manyImagesThreshold = Math.max(0.004, threshold * 0.7);
    return metrics.imageCount >= 4 && metrics.imageCoverage >= manyImagesThreshold;
  }
"""
engine = replace_once(engine, old_decision, new_decision, 'Decisão de rasterização')
engine_path.write_text(engine, encoding='utf-8')

app_path = Path('assets/js/app.js')
app = app_path.read_text(encoding='utf-8')
old_sort_options = """              <option value=\"manual\">Ordem manual</option>
              <option value=\"added\">Ordem de adição</option>
              <option value=\"nameAsc\">Nome: A → Z</option>
"""
new_sort_options = """              <option value=\"nameAsc\" selected>Nome: A → Z</option>
              <option value=\"manual\">Ordem manual</option>
              <option value=\"added\">Ordem de adição</option>
"""
app = replace_once(app, old_sort_options, new_sort_options, 'Ordenação padrão da união')
app = app.replace('Inteligente — equilíbrio e redução automática', 'Automático — boa qualidade e boa redução', 1)
app = app.replace('min=\"40\" max=\"300\" value=\"96\"', 'min=\"60\" max=\"300\" value=\"120\"', 1)
app = app.replace('min=\"20\" max=\"100\" value=\"52\"', 'min=\"30\" max=\"100\" value=\"68\"', 1)
old_notice = 'O motor analisa cada página. Páginas apenas com texto e vetores permanecem nativas; somente páginas com imagens relevantes são reconstruídas. Nas páginas reconstruídas, texto selecionável, links, formulários e assinaturas deixam de existir.'
new_notice = 'No modo Automático, o motor prioriza nitidez: preserva páginas com texto e vetores e só reconstrói páginas escaneadas ou dominadas por imagens. O modo Forte busca arquivos menores e pode reduzir mais a qualidade. Nas páginas reconstruídas, texto selecionável, links, formulários e assinaturas deixam de existir.'
app = replace_once(app, old_notice, new_notice, 'Aviso de qualidade')
helper_anchor = """  function applyMergeSourceOrder(sourceKeys, options = {}) {
"""
helper = """  function applyDefaultMergeNameOrder() {
    const entries = mergePdfSources();
    if (entries.length < 2) return;
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const ordered = [...entries].sort((a, b) => collator.compare(a[1]?.name || a[1]?.file?.name || '', b[1]?.name || b[1]?.file?.name || ''));
    const sourceKeys = ordered.map(([key]) => key);
    const sources = new Map(entries);
    const orderedFiles = sourceKeys.map(key => sources.get(key)?.file).filter(Boolean);
    const orderedFileKeys = new Set(orderedFiles.map(getFileCacheKey));
    state.files = [...orderedFiles, ...state.files.filter(file => !orderedFileKeys.has(getFileCacheKey(file)))];
    state.organizerPages = reorderPagesBySourceKeys(state.organizerPages, sourceKeys);
    state.originalOrganizerPages = reorderPagesBySourceKeys(state.originalOrganizerPages, sourceKeys);
    const selector = $('#mergeSourceSort');
    if (selector) selector.value = 'nameAsc';
  }

"""
if helper not in app:
    app = replace_once(app, helper_anchor, helper + helper_anchor, 'Ponto do helper A-Z')
old_append = """    state.organizerPages.push(...additions);
    state.originalOrganizerPages = snapshotOrganizerPages();
    dropzone.classList.add('compact');
    await renderOrganizerPreviews();
"""
new_append = """    state.organizerPages.push(...additions);
    state.originalOrganizerPages = snapshotOrganizerPages();
    if (prefix === 'merge' && ($('#mergeSourceSort')?.value || 'nameAsc') === 'nameAsc') applyDefaultMergeNameOrder();
    dropzone.classList.add('compact');
    await renderOrganizerPreviews();
"""
app = replace_once(app, old_append, new_append, 'Aplicação inicial A-Z')
app_path.write_text(app, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8').replace('centralpdf-v1.2.1-pages-5', 'centralpdf-v1.2.1-pages-6')
sw_path.write_text(sw, encoding='utf-8')

for test_path in Path('tests').glob('*'):
    if test_path.suffix not in {'.py', '.js'}:
        continue
    text = test_path.read_text(encoding='utf-8')
    changed = text.replace('centralpdf-v1.2.1-pages-5', 'centralpdf-v1.2.1-pages-6')
    changed = changed.replace("recommendedTarget'] == .48", "recommendedTarget'] == .35")
    changed = changed.replace("targetReduction: .48", "targetReduction: .35")
    if changed != text:
        test_path.write_text(changed, encoding='utf-8')

merge_test = Path('tests/merge-source-order.test.py')
merge_text = merge_test.read_text(encoding='utf-8')
merge_text = merge_text.replace(
    "assert names() == ['30 Relatorio.pdf','2 Contrato.pdf','11 Certidao.pdf'], names()\n    assert page.locator('#mergeSourceSort').count() == 1",
    "assert names() == ['2 Contrato.pdf','11 Certidao.pdf','30 Relatorio.pdf'], names()\n    assert page.locator('#mergeSourceSort').count() == 1\n    assert page.locator('#mergeSourceSort').input_value() == 'nameAsc'"
)
merge_test.write_text(merge_text, encoding='utf-8')

Path('tests/quality-balanced-auto.test.js').write_text("""const assert = require('node:assert/strict');
const planner = require('../assets/js/advanced-planner.js');
const engine = require('../assets/js/compression-engine.js');

const auto = planner.compressionProfile('recommended');
assert.equal(auto.targetReduction, .35);
assert.equal(auto.qualityPriority, true);
assert.equal(auto.largeDocumentAttempt.dpi, 96);
assert.equal(auto.largeDocumentAttempt.quality, .62);
assert.equal(auto.largeDocumentAttempt.preserveText, true);
assert.ok(auto.attempts.every(item => item.dpi >= 96 && item.quality >= .60));
assert.ok(auto.attempts.every(item => item.preserveText === true));

const mixedPage = {
  imageCount: 2,
  textOps: 20,
  vectorOps: 5,
  imageCoverage: .28,
  maxImageCoverage: .22,
  imageDominated: false,
  likelyScanned: false
};
assert.equal(engine.shouldRasterizePage(mixedPage, auto.attempts[0]), false, 'Página mista com texto deve permanecer nativa no automático.');

const scannedPage = {
  imageCount: 1,
  textOps: 0,
  vectorOps: 0,
  imageCoverage: .98,
  maxImageCoverage: .98,
  imageDominated: true,
  likelyScanned: true
};
assert.equal(engine.shouldRasterizePage(scannedPage, auto.attempts[0]), true, 'Página escaneada deve ser comprimida.');

const ocrScan = { ...scannedPage, textOps: 30, likelyScanned: true };
assert.equal(engine.shouldRasterizePage(ocrScan, auto.attempts[0]), true, 'Imagem dominante com camada OCR deve ser comprimida.');
console.log('quality-balanced-auto: passed');
""", encoding='utf-8')

Path('tests/merge-default-az.test.py').write_text("""from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')

assert '<option value=\"nameAsc\" selected>Nome: A → Z</option>' in app
assert 'function applyDefaultMergeNameOrder()' in app
assert "if (prefix === 'merge' && ($('#mergeSourceSort')?.value || 'nameAsc') === 'nameAsc') applyDefaultMergeNameOrder();" in app
print('merge-default-az: passed')
""", encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
entry = """## Compressão automática com prioridade de qualidade e união A-Z

- recalibra o modo Automático para 96-120 DPI e qualidade JPEG de 60-72%;
- preserva páginas mistas com texto e vetores, evitando a perda visual observada na rasterização de página inteira em baixa resolução;
- reconhece páginas escaneadas e imagens dominantes, inclusive documentos com camada OCR;
- mantém o modo Forte separado para quem prioriza o menor tamanho possível;
- altera a ordem inicial de Juntar PDFs para Nome: A → Z;
- novos PDFs continuam em A-Z enquanto o usuário não mudar para ordem manual;
- renova o cache do aplicativo.

"""
if entry not in changelog:
    changelog_path.write_text(entry + changelog, encoding='utf-8')
