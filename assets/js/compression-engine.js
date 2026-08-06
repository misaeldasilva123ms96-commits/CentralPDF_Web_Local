(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CentralPDFCompressionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function determinant(matrix) {
    if (!Array.isArray(matrix) || matrix.length < 4) return 1;
    return finite(matrix[0], 1) * finite(matrix[3], 1) - finite(matrix[1]) * finite(matrix[2]);
  }

  function operationCodes(OPS, names) {
    return new Set(names.map(name => OPS?.[name]).filter(value => Number.isFinite(value)));
  }

  function analyzeOperatorList(operatorList, OPS, pageArea = 1) {
    const fnArray = operatorList?.fnArray || [];
    const argsArray = operatorList?.argsArray || [];
    const saveCode = OPS?.save;
    const restoreCode = OPS?.restore;
    const transformCode = OPS?.transform;
    const imageCodes = operationCodes(OPS, [
      'paintImageXObject', 'paintJpegXObject', 'paintInlineImageXObject',
      'paintImageMaskXObject', 'paintSolidColorImageMask', 'paintImageMaskXObjectGroup',
      'paintImageXObjectRepeat', 'paintInlineImageXObjectGroup'
    ]);
    const textCodes = operationCodes(OPS, [
      'showText', 'showSpacedText', 'nextLineShowText', 'nextLineSetSpacingShowText'
    ]);
    const vectorCodes = operationCodes(OPS, [
      'constructPath', 'stroke', 'fill', 'eoFill', 'fillStroke', 'eoFillStroke',
      'closeStroke', 'closeFillStroke', 'closeEOFillStroke', 'shadingFill'
    ]);

    let areaScale = 1;
    const stack = [];
    let imageCount = 0;
    let textOps = 0;
    let vectorOps = 0;
    let imageArea = 0;
    let maxImageArea = 0;

    for (let index = 0; index < fnArray.length; index++) {
      const fn = fnArray[index];
      const args = argsArray[index] || [];
      if (fn === saveCode) {
        stack.push(areaScale);
        continue;
      }
      if (fn === restoreCode) {
        areaScale = stack.length ? stack.pop() : 1;
        continue;
      }
      if (fn === transformCode) {
        areaScale *= Math.abs(determinant(args));
        continue;
      }
      if (textCodes.has(fn)) {
        textOps += 1;
        continue;
      }
      if (vectorCodes.has(fn)) {
        vectorOps += 1;
        continue;
      }
      if (!imageCodes.has(fn)) continue;

      imageCount += 1;
      let paintedArea = Math.abs(areaScale);
      if (fn === OPS?.paintImageXObjectRepeat) {
        const scaleX = Math.abs(finite(args[1], 1));
        const scaleY = Math.abs(finite(args[2], 1));
        const positions = Array.isArray(args[3]) || ArrayBuffer.isView(args[3]) ? args[3].length / 2 : 1;
        paintedArea = Math.abs(areaScale) * scaleX * scaleY * Math.max(1, positions);
      }
      if (!Number.isFinite(paintedArea) || paintedArea <= 0) paintedArea = 1;
      imageArea += paintedArea;
      maxImageArea = Math.max(maxImageArea, paintedArea);
    }

    const safePageArea = Math.max(1, finite(pageArea, 1));
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
  }

  async function analyzePage(page, pdfjsLib) {
    const viewport = page.getViewport({ scale: 1 });
    const operatorList = await page.getOperatorList({ intent: 'print' });
    return analyzeOperatorList(operatorList, pdfjsLib?.OPS || {}, viewport.width * viewport.height);
  }

  function shouldRasterizePage(metrics, profile = {}) {
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

  function summarize(metricsByPage, profile = {}) {
    const metrics = Array.isArray(metricsByPage) ? metricsByPage.filter(Boolean) : [];
    const rasterizedPages = metrics.filter(item => shouldRasterizePage(item, profile)).length;
    return {
      selectedPages: metrics.length,
      rasterizedPages,
      preservedPages: Math.max(0, metrics.length - rasterizedPages),
      scannedPages: metrics.filter(item => item.likelyScanned).length,
      imagePages: metrics.filter(item => item.imageCount > 0).length,
      textOnlyPages: metrics.filter(item => item.imageCount === 0).length
    };
  }

  function describeStats(stats) {
    if (!stats) return '';
    return `${stats.rasterizedPages}/${stats.selectedPages} página(s) rasterizada(s); ${stats.preservedPages} preservada(s)`;
  }

  return {
    determinant,
    analyzeOperatorList,
    analyzePage,
    shouldRasterizePage,
    summarize,
    describeStats
  };
});
