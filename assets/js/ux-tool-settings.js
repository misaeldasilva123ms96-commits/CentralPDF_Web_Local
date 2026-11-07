/* Per-tool progressive disclosure. Never move part of a conditional panel. */
(() => {
  'use strict';
  const advanced = {
    organize: [], editPdf: [], merge: ['mergePreserveMetadata'],
    split: ['splitIncludeManifest'], extract: ['extractAllowDuplicates','extractManifest'],
    rotate: ['rotateBehavior'],
    watermark: ['watermarkFont','watermarkColor','watermarkRotation','watermarkPattern'],
    pageNumbers: ['numberSize','numberColor','numberMargin','numberTotalMode','numberBackground'],
    imagesToPdf: [], imageConvert: ['maxWidth','maxHeight'],
    compress: ['compressionStripMetadata','compressionKeepSmaller','compressionReport'],
    pdfToImage: ['pdfImageQuality','pdfImageColumns','pdfImageGrayscale','pdfImageTransparent','pdfImagePrefix'],
    crop: ['cropBehavior'], metadata: [], normalize: [], pdfToText: [],
    ocr: ['ocrPageSegMode','ocrNativeThreshold','ocrAutoRotate','ocrGrayscale','ocrContrast','ocrThresholdEnabled','ocrThreshold','ocrPreserveNative','ocrPageHeaders','ocrIncludeReport','ocrDetectPatterns','ocrConfidenceThreshold'],
    compare: ['compareIgnoreCase','compareIgnoreWhitespace','compareDpi','compareThreshold','compareIncludeImages'],
    redact: ['redactionDpi','redactionColor','redactionLabel','redactionReport'],
    formBuilder: ['formFieldFontSize','formFieldMaxLength','formFieldTextColor','formFieldBorderColor','formFieldBackground'],
    signPdf: ['signatureRotation'], pdfToOffice: ['officeExportDpi'],
    documentsToPdf: ['docToPdfFontSize','docToPdfImagePage'],
    extractImages: ['extractImageMinWidth','extractImageMinHeight','extractImageDedupe'],
    archivePdf: ['archiveDpi','archiveFlattenForms','archiveRemoveMetadata','archiveManifest'],
    documentAssistant: ['intelligenceEvidenceCount','intelligenceIncludeSections','intelligenceIncludePatterns'],
    structuredExtraction: ['extractionIncludePages','extractionGroupByFile','extractionExportXlsx','extractionCustomRegex'],
    documentAudit: [], classifyRename: ['renameMaxLength','renameIncludeCopies','renameDetectBlank','renameDetectDuplicates','renameUseDate'],
    protect: ['protectOwnerPassword','protectAlgorithm','permPrint','permCopy','permModify','permAnnotate','permForms'],
    unlock: [], diagnose: ['diagnoseJson'], repairAdvanced: [], flattenForms: []
  };
  window.addEventListener('centralpdf-tool-selected', event => {
    const ids = new Set(advanced[event.detail.tool] || []);
    const host = document.getElementById('settingsContent');
    if (!host || !ids.size || document.getElementById('toolAdvanced')) return;
    const nodes = Array.from(host.children).filter(node => {
      // Conditional visibility belongs to existing handlers. Move their whole
      // container only if every contained control is explicitly secondary.
      const fields = Array.from(node.querySelectorAll('input,select,textarea,button'));
      if (node.matches('input,select,textarea,button')) fields.push(node);
      return fields.length && fields.every(field => ids.has(field.id)) && !node.classList.contains('notice-card');
    });
    if (!nodes.length) return;
    const details = document.createElement('details'); details.id='toolAdvanced';details.className='ux-advanced';
    const summary = document.createElement('summary');summary.textContent='Mais opções';
    const body = document.createElement('div');body.className='ux-advanced-body';
    details.append(summary,body);
    for (const node of nodes) body.append(node);
    const output = document.getElementById('outputFileName')?.closest('.field');
    if (output) output.before(details); else host.append(details);
  });
})();
