const assert = require('node:assert/strict');
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
