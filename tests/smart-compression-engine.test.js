const engine = require('../assets/js/compression-engine.js');

const OPS = {
  save: 1,
  restore: 2,
  transform: 3,
  paintImageXObject: 4,
  paintImageXObjectRepeat: 5,
  showText: 6,
  constructPath: 7
};

const mixed = engine.analyzeOperatorList({
  fnArray: [OPS.save, OPS.transform, OPS.paintImageXObject, OPS.restore, OPS.showText],
  argsArray: [[], [300, 0, 0, 400, 0, 0], ['Im0'], [], ['texto']]
}, OPS, 500000);

if (mixed.imageCount !== 1) throw new Error('A imagem principal não foi detectada.');
if (mixed.textOps !== 1) throw new Error('O texto da página não foi detectado.');
if (Math.abs(mixed.maxImageCoverage - 0.24) > 0.0001) throw new Error(`Cobertura inesperada: ${mixed.maxImageCoverage}`);
if (!engine.shouldRasterizePage(mixed, { minImageCoverage: 0.08 })) throw new Error('Página com imagem relevante deveria ser rasterizada.');

const logo = engine.analyzeOperatorList({
  fnArray: [OPS.transform, OPS.paintImageXObject, OPS.showText],
  argsArray: [[35, 0, 0, 35, 0, 0], ['Logo'], ['texto']]
}, OPS, 500000);
if (engine.shouldRasterizePage(logo, { minImageCoverage: 0.02 })) throw new Error('Logo pequeno não deve forçar rasterização da página inteira.');

const textOnly = engine.analyzeOperatorList({
  fnArray: [OPS.showText, OPS.constructPath],
  argsArray: [['texto'], []]
}, OPS, 500000);
if (engine.shouldRasterizePage(textOnly, { minImageCoverage: 0 })) throw new Error('Página sem imagens deve permanecer vetorial.');

const scan = engine.analyzeOperatorList({
  fnArray: [OPS.transform, OPS.paintImageXObject],
  argsArray: [[595, 0, 0, 842, 0, 0], ['Scan']]
}, OPS, 595 * 842);
if (!scan.likelyScanned) throw new Error('Página escaneada não foi reconhecida.');
if (!engine.shouldRasterizePage(scan, { minImageCoverage: 0.9 })) throw new Error('Página escaneada deve ser comprimida mesmo acima do limiar.');

const stats = engine.summarize([mixed, logo, textOnly, scan], { minImageCoverage: 0.02 });
if (stats.rasterizedPages !== 2 || stats.preservedPages !== 2) throw new Error(`Resumo inesperado: ${JSON.stringify(stats)}`);

console.log('smart-compression-engine: passed');
