from pathlib import Path
import re


def replace_function(text: str, name: str, replacement: str, next_name: str) -> str:
    pattern = rf"  async function {re.escape(name)}\([^\n]*\) \{{.*?(?=\n  async function {re.escape(next_name)}\()"
    updated, count = re.subn(pattern, replacement.rstrip(), text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'Não foi possível substituir {name}: {count}')
    return updated

app_path = Path('assets/js/app.js')
app = app_path.read_text(encoding='utf-8')

adaptive = r'''  async function analyzeCompressionPages(file, scope, pageText, fileIndex, fileTotal) {
    await ensurePdfWorker();
    if (!window.CentralPDFCompressionEngine) throw new Error('O analisador inteligente de compressão não carregou.');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    let rendered = null;
    try {
      rendered = await loadingTask.promise;
      const selectedPages = new Set(AdvancedPlanner.resolveScope(scope, rendered.numPages, pageText));
      const metricsByPage = Array(rendered.numPages).fill(null);
      let completed = 0;
      for (const pageIndex of selectedPages) {
        const page = await rendered.getPage(pageIndex + 1);
        try {
          metricsByPage[pageIndex] = await window.CentralPDFCompressionEngine.analyzePage(page, pdfjsLib);
        } catch (_) {
          metricsByPage[pageIndex] = {
            imageCount: 1, textOps: 0, vectorOps: 0,
            imageCoverage: 1, maxImageCoverage: 1, likelyScanned: true,
            analysisFallback: true
          };
        } finally {
          try { page.cleanup(); } catch (_) {}
        }
        completed += 1;
        setProgress(5 + Math.round(((fileIndex + (completed / Math.max(1, selectedPages.size)) * .18) / fileTotal) * 80));
      }
      return { metricsByPage, selectedPages, numPages: rendered.numPages };
    } finally {
      try { await rendered?.cleanup?.(); } catch (_) {}
      try { await loadingTask.destroy(); } catch (_) {}
    }
  }

  async function rasterCompressPdfAdaptive(file, profile, scope, pageText, stripMetadata, fileIndex, fileTotal) {
    const attempts = profile.attempts?.length ? profile.attempts : [{
      dpi: profile.dpi || 72,
      quality: profile.quality || .42,
      minImageCoverage: profile.minImageCoverage ?? 0
    }];
    const analysis = await analyzeCompressionPages(file, scope, pageText, fileIndex, fileTotal);
    const candidates = [];
    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
      const attempt = { ...attempts[attemptIndex], grayscale: Boolean(profile.grayscale) };
      const result = await rasterCompressPdfAdvanced(file, attempt, scope, pageText, stripMetadata, fileIndex, fileTotal, analysis);
      candidates.push({ ...attempt, bytes: result.bytes, stats: result.stats });
      const reduction = file.size ? 1 - result.bytes.byteLength / file.size : 0;
      if (!profile.adaptive || reduction >= (profile.targetReduction || 0)) break;
    }
    return AdvancedPlanner.chooseCompressionCandidate(candidates, file.size, profile.targetReduction || 0);
  }'''
app = replace_function(app, 'rasterCompressPdfAdaptive', adaptive, 'compress')

advanced = r'''  async function rasterCompressPdfAdvanced(file, profile, scope, pageText, stripMetadata, fileIndex, fileTotal, analysis = null) {
    await ensurePdfWorker();
    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const pdfJsBytes = originalBytes.slice();
    const pdfLibBytes = originalBytes.slice();
    const loadingTask = pdfjsLib.getDocument({ data: pdfJsBytes });
    let rendered = null;
    try {
      rendered = await loadingTask.promise;
      const source = await PDFLib.PDFDocument.load(pdfLibBytes, { updateMetadata: false });
      const output = await PDFLib.PDFDocument.create();
      if (!stripMetadata) copyDocumentMetadata(source, output);
      const selectedPages = analysis?.selectedPages || new Set(AdvancedPlanner.resolveScope(scope, rendered.numPages, pageText));
      const metricsByPage = analysis?.metricsByPage || Array(rendered.numPages).fill(null);
      let rasterizedPages = 0;
      let preservedPages = 0;
      for (let pageIndex = 0; pageIndex < rendered.numPages; pageIndex++) {
        const metrics = metricsByPage[pageIndex];
        const shouldRasterize = selectedPages.has(pageIndex)
          && window.CentralPDFCompressionEngine.shouldRasterizePage(metrics, profile);
        if (!shouldRasterize) {
          const [copied] = await output.copyPages(source, [pageIndex]);
          output.addPage(copied);
          if (selectedPages.has(pageIndex)) preservedPages += 1;
        } else {
          const page = await rendered.getPage(pageIndex + 1);
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: profile.dpi / 72 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          const context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport, intent: 'print' }).promise;
          if (profile.grayscale) grayscaleCanvas(canvas);
          const blob = await canvasToBlob(canvas, 'image/jpeg', profile.quality);
          const image = await output.embedJpg(await blob.arrayBuffer());
          const newPage = output.addPage([baseViewport.width, baseViewport.height]);
          newPage.drawImage(image, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
          rasterizedPages += 1;
          canvas.width = 1;
          canvas.height = 1;
          try { page.cleanup(); } catch (_) {}
        }
        setProgress(20 + Math.round(((fileIndex + (pageIndex + 1) / rendered.numPages) / fileTotal) * 75));
      }
      const bytes = await output.save({ useObjectStreams: true, objectsPerTick: 40 });
      return {
        bytes,
        stats: {
          selectedPages: selectedPages.size,
          rasterizedPages,
          preservedPages,
          totalPages: rendered.numPages,
          scannedPages: metricsByPage.filter(item => item?.likelyScanned).length,
          textOnlyPages: metricsByPage.filter(item => item && item.imageCount === 0).length
        }
      };
    } finally {
      try { await rendered?.cleanup?.(); } catch (_) {}
      try { await loadingTask.destroy(); } catch (_) {}
    }
  }'''
app = replace_function(app, 'rasterCompressPdfAdvanced', advanced, 'pdfToImage')

app = app.replace("selected.method = 'raster adaptativa';", "selected.method = 'raster inteligente por conteúdo';")
old_details = "const details = selected.dpi ? `${selected.dpi} DPI, JPG ${Math.round(selected.quality * 100)}%` : selected.method;"
new_details = "const pageStats = selected.stats ? window.CentralPDFCompressionEngine.describeStats(selected.stats) : '';\n      const details = selected.dpi ? `${selected.dpi} DPI, JPG ${Math.round(selected.quality * 100)}%${pageStats ? `; ${pageStats}` : ''}` : selected.method;"
if old_details not in app:
    raise RuntimeError('Linha de detalhes da compressão não encontrada.')
app = app.replace(old_details, new_details, 1)

app = app.replace(
    "title: 'Comprimir PDF avançado', description: 'Escolha o perfil, as páginas rasterizadas, qualidade, escala de cinza e relatório de redução.'",
    "title: 'Comprimir PDF avançado', description: 'Analise o conteúdo e comprima somente páginas com imagens relevantes, preservando texto e vetores quando possível.'"
)
app = app.replace('min="60" max="300" value="108"', 'min="40" max="300" value="96"', 1)
app = app.replace('min="30" max="100" value="62"', 'min="20" max="100" value="52"', 1)
old_warning = 'Os perfis recomendada, extrema e personalizada transformam as páginas escolhidas em imagens. Nessas páginas, texto selecionável, links, formulários e assinaturas deixam de existir.'
new_warning = 'O motor analisa cada página. Páginas apenas com texto e vetores permanecem nativas; somente páginas com imagens relevantes são reconstruídas. Nas páginas reconstruídas, texto selecionável, links, formulários e assinaturas deixam de existir.'
if old_warning not in app:
    raise RuntimeError('Aviso antigo de rasterização não encontrado.')
app = app.replace(old_warning, new_warning, 1)
app_path.write_text(app, encoding='utf-8')

planner_path = Path('assets/js/advanced-planner.js')
planner = planner_path.read_text(encoding='utf-8')
profile_pattern = r"  function compressionProfile\(mode, custom = \{\}\) \{.*?(?=\n  function chooseCompressionCandidate)"
profile_replacement = r'''  function compressionProfile(mode, custom = {}) {
    if (mode === 'preserve') return { rasterize: false, adaptive: false, attempts: [], targetReduction: 0, grayscale: false };
    if (mode === 'recommended') return {
      rasterize: true, adaptive: true, targetReduction: .50, grayscale: false,
      attempts: [
        { dpi: 78, quality: .48, minImageCoverage: .05 },
        { dpi: 64, quality: .36, minImageCoverage: .02 },
        { dpi: 56, quality: .30, minImageCoverage: .01 }
      ]
    };
    if (mode === 'extreme') return {
      rasterize: true, adaptive: true, targetReduction: .62, grayscale: false,
      attempts: [
        { dpi: 60, quality: .34, minImageCoverage: .02 },
        { dpi: 52, quality: .27, minImageCoverage: .008 },
        { dpi: 46, quality: .23, minImageCoverage: .003 }
      ]
    };
    if (mode === 'custom') {
      const dpi = Math.max(40, Math.min(300, Number(custom.dpi || 96)));
      const quality = Math.max(.2, Math.min(1, Number(custom.quality || 52) / 100));
      return { rasterize: true, adaptive: false, dpi, quality, minImageCoverage: 0, grayscale: Boolean(custom.grayscale) };
    }
    throw new Error(`Perfil de compressão desconhecido: ${mode}`);
  }'''
planner, count = re.subn(profile_pattern, profile_replacement.rstrip(), planner, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f'Perfil de compressão não substituído: {count}')
planner_path.write_text(planner, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if 'assets/js/compression-engine.js' not in index:
    index, count = re.subn(
        r'(<script\s+src="assets/js/advanced-planner\.js"[^>]*></script>)',
        r'\1\n  <script src="assets/js/compression-engine.js"></script>',
        index,
        count=1
    )
    if count != 1:
        raise RuntimeError('Ponto de inclusão do motor de compressão não encontrado no index.html.')
index_path.write_text(index, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
sw = sw.replace("centralpdf-v1.2.1-pages-4", "centralpdf-v1.2.1-pages-5")
if "'./assets/js/compression-engine.js'" not in sw:
    sw = sw.replace(
        "'./assets/js/engine-loader.js', './assets/js/split-planner.js', './assets/js/advanced-planner.js',",
        "'./assets/js/engine-loader.js', './assets/js/split-planner.js', './assets/js/advanced-planner.js',\n  './assets/js/compression-engine.js',"
    )
sw_path.write_text(sw, encoding='utf-8')

for test_path in Path('tests').glob('*'):
    if test_path.suffix not in {'.py', '.js'}:
        continue
    text = test_path.read_text(encoding='utf-8')
    changed = text.replace('centralpdf-v1.2.1-pages-4', 'centralpdf-v1.2.1-pages-5')
    if test_path.name == 'compression-worker-1.1.6.test.py':
        changed = changed.replace("assert result['recommendedTarget'] == .25", "assert result['recommendedTarget'] == .50")
        changed = changed.replace("assert result['strongTarget'] == .45", "assert result['strongTarget'] == .62")
        changed = changed.replace("assert 'rasterCompressPdfAdaptive' in app", "assert 'analyzeCompressionPages' in app\nassert 'raster inteligente por conteúdo' in app\nassert 'rasterCompressPdfAdaptive' in app")
    if changed != text:
        test_path.write_text(changed, encoding='utf-8')

Path('tests/smart-compression-integration.test.py').write_text("""from pathlib import Path

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
""", encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
entry = """## Compressão inteligente por conteúdo

- analisa imagens, texto e vetores de cada página antes de decidir pela rasterização;
- preserva páginas somente textuais ou vetoriais, evitando transformar centenas de páginas leves em imagens maiores;
- aplica limiares progressivos de cobertura visual e perfis adaptativos para documentos extensos;
- amplia o perfil forte para buscar reduções acima de 60% quando o conteúdo permite;
- informa no relatório quantas páginas foram rasterizadas e quantas permaneceram nativas;
- mantém o arquivo original quando nenhum candidato é menor;
- renova o cache para entregar o novo motor imediatamente.

"""
if entry not in changelog:
    changelog_path.write_text(entry + changelog, encoding='utf-8')
