(() => {
  'use strict';

  const VERSION = '1.0.0';
  const REMOTE = {
    script: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
    core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
    lang: 'https://tessdata.projectnaptha.com/4.0.0'
  };
  const LOCAL = {
    script: 'vendor/tesseract/tesseract.min.js',
    worker: 'vendor/tesseract/worker.min.js',
    core: 'vendor/tesseract-core',
    lang: 'vendor/tessdata/4.0.0'
  };

  const runtime = {
    mounted: false,
    boundOutput: null,
    enginePromise: null,
    engineSource: 'não carregado',
    workerSource: 'não iniciado',
    lastReports: [],
    planToken: 0
  };

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-ocr-engine][src="${CSS.escape(url)}"]`);
      if (existing) {
        if (window.Tesseract?.createWorker) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.ocrEngine = 'tesseract';
      script.onload = () => window.Tesseract?.createWorker ? resolve() : reject(new Error('A API do Tesseract não foi encontrada.'));
      script.onerror = () => { script.remove(); reject(new Error(`Falha ao carregar ${url}.`)); };
      document.head.appendChild(script);
    });
  }

  async function ensureEngine() {
    if (window.Tesseract?.createWorker) return runtime.engineSource;
    if (runtime.enginePromise) return runtime.enginePromise;
    runtime.enginePromise = (async () => {
      try {
        await loadScript(new URL(LOCAL.script, document.baseURI).href);
        runtime.engineSource = 'local';
        return 'local';
      } catch (localError) {
        try {
          await loadScript(REMOTE.script);
          runtime.engineSource = 'internet';
          return 'internet';
        } catch (remoteError) {
          runtime.enginePromise = null;
          throw new Error('O motor OCR não foi carregado. Execute PREPARAR_OFFLINE.bat ou conecte o computador à internet.');
        }
      }
    })();
    return runtime.enginePromise;
  }

  function localUrl(path) { return new URL(path, document.baseURI).href.replace(/\/$/, ''); }

  async function ensurePdfWorker() {
    if (!window.pdfjsLib?.GlobalWorkerOptions) return;
    if (window.pdfjsLib.GlobalWorkerOptions.workerSrc) return;
    const paths = window.CentralPDFEnginePaths || {};
    const local = paths.pdfWorker || 'vendor/pdf.worker.min.js';
    const remote = paths.pdfWorkerRemote || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try {
      const response = await fetch(local, { cache: 'force-cache' });
      if (!response.ok) throw new Error('worker local indisponível');
      const source = await response.text();
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    } catch (_) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = remote;
    }
  }

  async function createWorker(language, logger) {
    const source = await ensureEngine();
    const langs = language.includes('+') ? language.split('+') : language;
    const configs = source === 'local'
      ? [
          { source: 'local', workerPath: localUrl(LOCAL.worker), corePath: localUrl(LOCAL.core), langPath: localUrl(LOCAL.lang) },
          { source: 'internet', workerPath: REMOTE.worker, corePath: REMOTE.core, langPath: REMOTE.lang }
        ]
      : [{ source: 'internet', workerPath: REMOTE.worker, corePath: REMOTE.core, langPath: REMOTE.lang }];
    let lastError;
    for (const options of configs) {
      try {
        const worker = await window.Tesseract.createWorker(langs, window.Tesseract.OEM?.LSTM_ONLY ?? 1, {
          workerPath: options.workerPath,
          corePath: options.corePath,
          langPath: options.langPath,
          cacheMethod: 'write',
          gzip: true,
          logger
        });
        runtime.workerSource = options.source;
        return worker;
      } catch (error) {
        lastError = error;
        console.warn(`OCR ${options.source} indisponível.`, error);
      }
    }
    throw new Error(`Não foi possível iniciar o OCR. ${lastError?.message || ''}`.trim());
  }

  function mount() {
    const outputElement = $('#ocrOutputMode');
    if (!outputElement) return;
    if (runtime.boundOutput === outputElement) { updatePanels(); return; }
    runtime.mounted = true;
    runtime.boundOutput = outputElement;
    const planIds = new Set(['ocrLanguage','ocrRecognitionMode','ocrDpi','ocrPageScope','ocrPages','ocrNativeThreshold']);
    const ids = ['ocrOutputMode','ocrLanguage','ocrRecognitionMode','ocrDpi','ocrPageScope','ocrPages','ocrPageSegMode','ocrManualRotation','ocrAutoRotate','ocrGrayscale','ocrContrast','ocrThresholdEnabled','ocrThreshold','ocrPreserveNative','ocrPageHeaders','ocrIncludeReport','ocrDetectPatterns','ocrNativeThreshold','ocrConfidenceThreshold'];
    ids.forEach(id => {
      const element = $(`#${id}`);
      if (!element) return;
      element.addEventListener(element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'input', () => {
        updatePanels();
        if (planIds.has(id)) updatePlan(window.CentralPDFApp?.getFiles?.() || []);
      });
    });
    $('#ocrReviewButton')?.addEventListener('click', showLastReview);
    updatePanels();
  }

  function updatePanels() {
    $('#ocrPagesPanel')?.classList.toggle('hidden', $('#ocrPageScope')?.value !== 'selected');
    $('#ocrThresholdPanel')?.classList.toggle('hidden', !$('#ocrThresholdEnabled')?.checked);
    $('#ocrReviewButton')?.classList.toggle('hidden', !runtime.lastReports.length);
  }

  async function updatePlan(files = []) {
    const panel = $('#ocrPlan');
    if (!panel) return;
    const token = ++runtime.planToken;
    if (!files.length) {
      panel.innerHTML = '<strong>Plano do OCR</strong><p>Adicione PDFs ou imagens para calcular páginas, tamanho e estimativa de processamento.</p>';
      return;
    }
    panel.innerHTML = '<strong>Analisando arquivos...</strong><p>Calculando páginas e texto já existente.</p>';
    let totalPages = 0;
    let pdfs = 0;
    let images = 0;
    let nativeSamples = 0;
    let scannedSamples = 0;
    try {
      for (const file of files) {
        if (isPdf(file) && window.pdfjsLib?.getDocument) {
          await ensurePdfWorker();
          pdfs++;
          const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
          totalPages += doc.numPages;
          const sampleIndexes = [...new Set([1, Math.ceil(doc.numPages / 2), doc.numPages])].filter(index => index >= 1 && index <= doc.numPages);
          for (const pageNumber of sampleIndexes) {
            const page = await doc.getPage(pageNumber);
            const text = await nativePageText(page);
            if (text.replace(/\s/g, '').length >= Number($('#ocrNativeThreshold')?.value || 25)) nativeSamples++;
            else scannedSamples++;
          }
          await doc.destroy();
        } else {
          images++;
          totalPages++;
          scannedSamples++;
        }
        if (token !== runtime.planToken) return;
      }
      const dpi = Number($('#ocrDpi')?.value || 200);
      const estimateMin = Math.max(1, Math.ceil(totalPages * (dpi >= 300 ? 7 : dpi >= 200 ? 4 : 2) / 60));
      panel.innerHTML = `<strong>${totalPages} página(s) em ${files.length} arquivo(s)</strong><p>${pdfs} PDF(s) e ${images} imagem(ns). Na amostra, ${nativeSamples} página(s) já têm texto e ${scannedSamples} parecem escaneadas. Estimativa local: aproximadamente ${estimateMin}${totalPages > 20 ? '–' + Math.max(estimateMin + 1, Math.ceil(estimateMin * 2.2)) : ''} minuto(s), dependendo do computador.</p>`;
    } catch (error) {
      panel.innerHTML = `<strong>Plano parcial</strong><p>${files.length} arquivo(s) selecionado(s). Não foi possível inspecionar todas as páginas: ${escapeHtml(error.message || error)}</p>`;
    }
  }

  function isPdf(file) { return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || ''); }
  function isImage(file) { return file?.type?.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file?.name || ''); }
  function fileBase(name) { return String(name || 'documento').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '_'); }

  function selectedIndexes(scope, text, count) {
    if (scope === 'all') return Array.from({ length: count }, (_, index) => index);
    if (scope === 'odd') return Array.from({ length: count }, (_, index) => index).filter(index => (index + 1) % 2 === 1);
    if (scope === 'even') return Array.from({ length: count }, (_, index) => index).filter(index => (index + 1) % 2 === 0);
    return parsePages(text, count);
  }

  function parsePages(text, count) {
    if (!String(text || '').trim()) throw new Error('Informe as páginas do OCR. Exemplo: 1-3,5.');
    const result = [];
    const seen = new Set();
    for (const token of String(text).split(',')) {
      const part = token.trim();
      if (!part) continue;
      const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
      const values = match
        ? Array.from({ length: Number(match[2]) - Number(match[1]) + 1 }, (_, index) => Number(match[1]) + index)
        : /^\d+$/.test(part) ? [Number(part)] : null;
      if (!values || (match && Number(match[1]) > Number(match[2]))) throw new Error(`Intervalo inválido: ${part}`);
      values.forEach(value => {
        if (value < 1 || value > count) throw new Error(`A página ${value} não existe. O documento possui ${count} página(s).`);
        if (!seen.has(value - 1)) { seen.add(value - 1); result.push(value - 1); }
      });
    }
    return result;
  }

  async function nativePageText(page) {
    const content = await page.getTextContent();
    return (content.items || []).map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
  }

  function preprocessCanvas(canvas, options) {
    if (!options.grayscale && !options.threshold && !options.contrast) return canvas;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const contrast = clamp(Number(options.contrast || 0), 0, 100) * 1.6;
    const factor = contrast ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
    const threshold = clamp(Number(options.thresholdValue || 170), 0, 255);
    for (let index = 0; index < data.length; index += 4) {
      let r = data[index], g = data[index + 1], b = data[index + 2];
      if (options.grayscale || options.threshold) {
        const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        r = g = b = grey;
      }
      if (contrast) {
        r = clamp(factor * (r - 128) + 128, 0, 255);
        g = clamp(factor * (g - 128) + 128, 0, 255);
        b = clamp(factor * (b - 128) + 128, 0, 255);
      }
      if (options.threshold) {
        const value = r >= threshold ? 255 : 0;
        r = g = b = value;
      }
      data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }

  async function renderPdfPage(page, options) {
    const baseRotation = Number(page.rotate || 0);
    const rotation = (baseRotation + Number(options.manualRotation || 0)) % 360;
    let scale = Number(options.dpi || 200) / 72;
    let viewport = page.getViewport({ scale, rotation });
    const maxPixels = 18_000_000;
    if (viewport.width * viewport.height > maxPixels) {
      scale *= Math.sqrt(maxPixels / (viewport.width * viewport.height));
      viewport = page.getViewport({ scale, rotation });
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    preprocessCanvas(canvas, options);
    return { canvas, rotation, effectiveDpi: Math.round(scale * 72) };
  }

  async function renderImage(file, options) {
    const bitmap = await createImageBitmap(file);
    try {
      const rotation = Number(options.manualRotation || 0) % 360;
      const swap = rotation === 90 || rotation === 270;
      const sourceWidth = bitmap.width;
      const sourceHeight = bitmap.height;
      let scale = 1;
      const longest = Math.max(sourceWidth, sourceHeight);
      if (longest < 1800) scale = Math.min(2.5, 1800 / Math.max(1, longest));
      if (sourceWidth * sourceHeight * scale * scale > 18_000_000) scale = Math.sqrt(18_000_000 / (sourceWidth * sourceHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((swap ? sourceHeight : sourceWidth) * scale));
      canvas.height = Math.max(1, Math.round((swap ? sourceWidth : sourceHeight) * scale));
      const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      if (rotation === 90) { context.translate(canvas.width, 0); context.rotate(Math.PI / 2); }
      else if (rotation === 180) { context.translate(canvas.width, canvas.height); context.rotate(Math.PI); }
      else if (rotation === 270) { context.translate(0, canvas.height); context.rotate(-Math.PI / 2); }
      context.drawImage(bitmap, 0, 0, sourceWidth * scale, sourceHeight * scale);
      context.restore();
      preprocessCanvas(canvas, options);
      return { canvas, rotation, effectiveDpi: Number(options.dpi || 200), pageSize: { width: canvas.width * 72 / Number(options.dpi || 200), height: canvas.height * 72 / Number(options.dpi || 200) } };
    } finally { bitmap.close(); }
  }

  function psmValue(value) {
    const map = { auto: '3', column: '4', block: '6', sparse: '11' };
    return map[value] || '3';
  }

  function readOptions() {
    return {
      outputMode: $('#ocrOutputMode')?.value || 'searchable',
      language: $('#ocrLanguage')?.value || 'por',
      recognitionMode: $('#ocrRecognitionMode')?.value || 'automatic',
      dpi: Number($('#ocrDpi')?.value || 200),
      scope: $('#ocrPageScope')?.value || 'all',
      pages: $('#ocrPages')?.value || '',
      psm: $('#ocrPageSegMode')?.value || 'auto',
      manualRotation: Number($('#ocrManualRotation')?.value || 0),
      autoRotate: Boolean($('#ocrAutoRotate')?.checked),
      grayscale: Boolean($('#ocrGrayscale')?.checked),
      contrast: Number($('#ocrContrast')?.value || 0),
      threshold: Boolean($('#ocrThresholdEnabled')?.checked),
      thresholdValue: Number($('#ocrThreshold')?.value || 170),
      preserveNative: Boolean($('#ocrPreserveNative')?.checked),
      pageHeaders: Boolean($('#ocrPageHeaders')?.checked),
      includeReport: Boolean($('#ocrIncludeReport')?.checked),
      detectPatterns: Boolean($('#ocrDetectPatterns')?.checked),
      nativeThreshold: Number($('#ocrNativeThreshold')?.value || 25),
      confidenceThreshold: Number($('#ocrConfidenceThreshold')?.value || 60)
    };
  }

  function detectPatterns(text) {
    const source = String(text || '');
    const patterns = {
      cpf: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
      cnpj: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
      dates: /\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:19|20)?\d{2}\b/g,
      values: /\bR\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g,
      emails: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    };
    return Object.fromEntries(Object.entries(patterns).map(([key, regex]) => [key, [...new Set(source.match(regex) || [])]]));
  }

  function flattenPatterns(patterns) {
    return Object.fromEntries(Object.entries(patterns).map(([key, values]) => [key, values.length]));
  }

  async function addPdfPageFromOcr(outputDoc, pdfBytes, targetSize) {
    const source = await window.PDFLib.PDFDocument.load(pdfBytes);
    const [page] = await outputDoc.copyPages(source, [0]);
    const current = page.getSize();
    const scaleX = targetSize.width / Math.max(1, current.width);
    const scaleY = targetSize.height / Math.max(1, current.height);
    if (typeof page.scaleContent === 'function') page.scaleContent(scaleX, scaleY);
    else if (typeof page.scale === 'function') page.scale(scaleX, scaleY);
    if (typeof page.setSize === 'function') page.setSize(targetSize.width, targetSize.height);
    outputDoc.addPage(page);
  }

  async function copyOriginalPage(outputDoc, sourceDoc, index) {
    const [page] = await outputDoc.copyPages(sourceDoc, [index]);
    outputDoc.addPage(page);
  }

  async function processFile(file, options, worker, callbacks, fileIndex, fileTotal) {
    const startedAt = performance.now();
    const needPdf = options.outputMode !== 'text';
    const needText = ['searchable-text', 'text', 'audit'].includes(options.outputMode);
    const outputDoc = needPdf ? await window.PDFLib.PDFDocument.create() : null;
    const pageReports = [];
    const texts = [];
    let pdfJsDoc = null;
    let sourcePdf = null;
    let pageCount = 1;
    let selected = [0];

    if (isPdf(file)) {
      await ensurePdfWorker();
      pdfJsDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      sourcePdf = needPdf ? await window.PDFLib.PDFDocument.load(await file.arrayBuffer()) : null;
      pageCount = pdfJsDoc.numPages;
      selected = selectedIndexes(options.scope, options.pages, pageCount);
    } else if (!isImage(file)) {
      throw new Error(`Formato não suportado pelo OCR: ${file.name}`);
    }
    const selectedSet = new Set(selected);

    for (let index = 0; index < pageCount; index++) {
      if (callbacks.cancelled()) throw new Error('Operação cancelada pelo usuário.');
      const pageStart = performance.now();
      const pageNumber = index + 1;
      const shouldProcessScope = selectedSet.has(index);
      let nativeText = '';
      let sourcePage = null;
      let targetSize = null;
      let rendered = null;
      let recognized = null;
      let status = 'não selecionada';
      let confidence = null;
      let effectiveDpi = options.dpi;

      if (isPdf(file)) {
        sourcePage = await pdfJsDoc.getPage(pageNumber);
        const viewport = sourcePage.getViewport({ scale: 1, rotation: (Number(sourcePage.rotate || 0) + options.manualRotation) % 360 });
        targetSize = { width: viewport.width, height: viewport.height };
        nativeText = await nativePageText(sourcePage);
      }

      if (!shouldProcessScope) {
        if (needPdf && sourcePdf) await copyOriginalPage(outputDoc, sourcePdf, index);
      } else {
        const hasNativeText = nativeText.replace(/\s/g, '').length >= options.nativeThreshold;
        const useNative = isPdf(file) && options.recognitionMode === 'automatic' && hasNativeText && options.preserveNative;
        if (useNative) {
          status = 'texto original preservado';
          confidence = 100;
          recognized = { text: nativeText, blocks: null, pdf: null };
          if (needPdf) await copyOriginalPage(outputDoc, sourcePdf, index);
        } else {
          status = 'OCR executado';
          rendered = isPdf(file) ? await renderPdfPage(sourcePage, options) : await renderImage(file, options);
          effectiveDpi = rendered.effectiveDpi;
          if (!targetSize) targetSize = rendered.pageSize;
          await worker.setParameters({
            tessedit_pageseg_mode: psmValue(options.psm),
            preserve_interword_spaces: '1',
            user_defined_dpi: String(effectiveDpi)
          });
          const result = await worker.recognize(rendered.canvas, {
            rotateAuto: options.autoRotate,
            pdfTitle: file.name,
            pdfTextOnly: false
          }, { text: true, blocks: true, pdf: needPdf });
          recognized = result.data;
          confidence = Number.isFinite(Number(recognized.confidence)) ? Number(recognized.confidence) : null;
          if (needPdf) {
            if (!recognized.pdf?.length) throw new Error(`O motor OCR não gerou a página pesquisável ${pageNumber}.`);
            await addPdfPageFromOcr(outputDoc, new Uint8Array(recognized.pdf), targetSize);
          }
          rendered.canvas.width = 1;
          rendered.canvas.height = 1;
        }
        const pageText = String(recognized?.text || nativeText || '').trim();
        if (needText || options.includeReport || options.detectPatterns) {
          texts.push(options.pageHeaders ? `===== PÁGINA ${pageNumber} =====\n${pageText}` : pageText);
        }
        const patterns = options.detectPatterns ? detectPatterns(pageText) : {};
        pageReports.push({
          page: pageNumber,
          status,
          confidence,
          lowConfidence: confidence !== null && confidence < options.confidenceThreshold,
          characters: pageText.length,
          excerpt: pageText.replace(/\s+/g, ' ').slice(0, 260),
          nativeCharacters: nativeText.length,
          effectiveDpi,
          durationMs: Math.round(performance.now() - pageStart),
          patterns
        });
      }

      const absolutePage = callbacks.completedPages + 1;
      callbacks.completedPages = absolutePage;
      const percentage = 8 + Math.round((absolutePage / Math.max(1, callbacks.totalPages)) * 86);
      callbacks.progress(percentage);
      callbacks.status(`OCR: ${fileIndex + 1}/${fileTotal} arquivo(s), página ${pageNumber}/${pageCount}.`);
      if (index % 2 === 1) await sleep(0);
    }

    if (pdfJsDoc) await pdfJsDoc.destroy();
    const completeText = texts.filter(Boolean).join('\n\n').trim();
    const allPatterns = options.detectPatterns ? detectPatterns(completeText) : {};
    const report = {
      application: `Central PDF & Imagem ${VERSION}`,
      file: file.name,
      fileSize: file.size,
      pages: pageCount,
      processedPages: pageReports.length,
      language: options.language,
      outputMode: options.outputMode,
      recognitionMode: options.recognitionMode,
      dpi: options.dpi,
      engineSource: runtime.workerSource,
      durationMs: Math.round(performance.now() - startedAt),
      averageConfidence: pageReports.filter(item => item.confidence !== null).length
        ? Math.round(pageReports.filter(item => item.confidence !== null).reduce((sum, item) => sum + item.confidence, 0) / pageReports.filter(item => item.confidence !== null).length * 10) / 10
        : null,
      lowConfidencePages: pageReports.filter(item => item.lowConfidence).map(item => item.page),
      detectedPatternCounts: flattenPatterns(allPatterns),
      detectedPatterns: allPatterns,
      pageReports
    };
    const outputs = [];
    const base = fileBase(file.name);
    if (needPdf) outputs.push({ filename: `${base}_pesquisavel.pdf`, blob: new Blob([await outputDoc.save()], { type: 'application/pdf' }) });
    if (needText) outputs.push({ filename: `${base}_OCR.txt`, blob: new Blob([completeText || 'Nenhum texto reconhecido.'], { type: 'text/plain;charset=utf-8' }) });
    if (options.includeReport || options.outputMode === 'audit') outputs.push({ filename: `${base}_OCR_relatorio.json`, blob: new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }) });
    return { outputs, report };
  }

  async function process(context) {
    if (!window.pdfjsLib?.getDocument || !window.PDFLib?.PDFDocument) throw new Error('Os motores PDF.js e pdf-lib precisam estar disponíveis para o OCR.');
    const files = Array.from(context.files || []);
    if (!files.length) throw new Error('Adicione pelo menos um PDF ou imagem.');
    const options = readOptions();
    context.status('Preparando o motor OCR...', 'processing');
    const totalPages = await countTotalPages(files);
    const callbacks = {
      totalPages,
      completedPages: 0,
      progress: context.progress,
      status: message => context.status(message, 'processing'),
      cancelled: context.cancelled
    };
    const worker = await createWorker(options.language, message => {
      if (!message || callbacks.cancelled()) return;
      const base = callbacks.totalPages ? callbacks.completedPages / callbacks.totalPages : 0;
      const within = Number(message.progress || 0) / Math.max(1, callbacks.totalPages);
      context.progress(8 + Math.round(clamp(base + within, 0, 1) * 86));
      if (message.status) context.status(`OCR: ${translateStatus(message.status)}.`, 'processing');
    });
    const outputs = [];
    const reports = [];
    try {
      for (let index = 0; index < files.length; index++) {
        const result = await processFile(files[index], options, worker, callbacks, index, files.length);
        outputs.push(...result.outputs);
        reports.push(result.report);
      }
    } finally {
      try { await worker.terminate(); } catch (_) {}
    }
    runtime.lastReports = reports;
    updatePanels();
    renderReview(reports);

    if (outputs.length === 1) return { outputs, message: buildCompletionMessage(reports) };
    if (!window.JSZip) throw new Error('O componente ZIP não está disponível para agrupar os resultados do OCR.');
    const zip = new window.JSZip();
    outputs.forEach(output => zip.file(output.filename, output.blob));
    const summary = buildTextReport(reports);
    zip.file('RESUMO_OCR.txt', summary);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return { outputs: [{ filename: 'OCR_resultados.zip', blob }], message: buildCompletionMessage(reports) };
  }

  async function countTotalPages(files) {
    let total = 0;
    for (const file of files) {
      if (isPdf(file)) {
        await ensurePdfWorker();
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        total += doc.numPages;
        await doc.destroy();
      } else total++;
    }
    return total;
  }

  function translateStatus(status) {
    const map = {
      'loading tesseract core': 'carregando núcleo',
      'initializing tesseract': 'inicializando',
      'loading language traineddata': 'carregando idioma',
      'initializing api': 'preparando reconhecimento',
      'recognizing text': 'reconhecendo texto'
    };
    return map[String(status).toLowerCase()] || status;
  }

  function buildCompletionMessage(reports) {
    const pages = reports.reduce((sum, report) => sum + report.processedPages, 0);
    const low = reports.reduce((sum, report) => sum + report.lowConfidencePages.length, 0);
    return `OCR concluído em ${pages} página(s).${low ? ` ${low} página(s) ficaram abaixo da confiança configurada e devem ser revisadas.` : ' Nenhuma página ficou abaixo da confiança configurada.'}`;
  }

  function buildTextReport(reports) {
    const lines = ['CENTRAL PDF & IMAGEM - RESUMO OCR', ''];
    reports.forEach(report => {
      lines.push(`Arquivo: ${report.file}`);
      lines.push(`Páginas processadas: ${report.processedPages}/${report.pages}`);
      lines.push(`Confiança média: ${report.averageConfidence ?? 'não calculada'}%`);
      lines.push(`Páginas para revisão: ${report.lowConfidencePages.length ? report.lowConfidencePages.join(', ') : 'nenhuma'}`);
      lines.push(`Tempo: ${(report.durationMs / 1000).toFixed(1)} s`);
      lines.push('');
    });
    return lines.join('\n');
  }

  function ensureReviewDialog() {
    if ($('#ocrReviewDialog')) return $('#ocrReviewDialog');
    const dialog = document.createElement('dialog');
    dialog.id = 'ocrReviewDialog';
    dialog.className = 'ocr-review-dialog';
    dialog.innerHTML = `<section><header><div><small>Controle de qualidade</small><h2>Revisão do OCR</h2><p>Confira confiança, texto reconhecido e páginas que merecem atenção.</p></div><button type="button" data-close-ocr>×</button></header><main id="ocrReviewContent"></main><footer><span>Confiança baixa não significa necessariamente erro, mas indica que a página deve ser conferida.</span><button type="button" data-close-ocr>Fechar</button></footer></section>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-ocr]').forEach(button => button.addEventListener('click', () => dialog.close()));
    return dialog;
  }

  function renderReview(reports) {
    const dialog = ensureReviewDialog();
    const content = dialog.querySelector('#ocrReviewContent');
    content.innerHTML = reports.map(report => `<article class="ocr-review-file"><div class="ocr-review-summary"><div><strong>${escapeHtml(report.file)}</strong><small>${report.processedPages} de ${report.pages} página(s) processada(s)</small></div><span class="${report.averageConfidence !== null && report.averageConfidence < 60 ? 'warn' : ''}">${report.averageConfidence ?? '—'}%</span></div><div class="ocr-review-pages">${report.pageReports.map(page => `<div class="${page.lowConfidence ? 'low' : ''}"><b>Página ${page.page}</b><span>${escapeHtml(page.status)}</span><strong>${page.confidence ?? '—'}%</strong><small>${page.characters} caracteres · ${(page.durationMs / 1000).toFixed(1)} s</small>${page.excerpt ? `<p>${escapeHtml(page.excerpt)}${page.characters > 260 ? '…' : ''}</p>` : ''}</div>`).join('')}</div></article>`).join('');
    $('#ocrLastSummary')?.classList.remove('hidden');
    const summary = $('#ocrLastSummary');
    if (summary) summary.innerHTML = `<strong>Último OCR concluído</strong><p>${escapeHtml(buildCompletionMessage(reports))}</p>`;
  }

  function showLastReview() {
    if (!runtime.lastReports.length) return;
    renderReview(runtime.lastReports);
    ensureReviewDialog().showModal();
  }

  function getStatus() {
    return {
      version: VERSION,
      mainReady: Boolean(window.Tesseract?.createWorker),
      engineSource: runtime.engineSource,
      workerSource: runtime.workerSource,
      lastReports: runtime.lastReports.length
    };
  }

  window.CentralPDFOCR = { mount, updatePlan, process, ensureEngine, getStatus, showLastReview };
})();
