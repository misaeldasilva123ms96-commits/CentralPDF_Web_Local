(() => {
  'use strict';

  const WORKER_URL = window.CentralPDFEnginePaths?.pdfWorkerRemote || 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/pdf.worker.min.mjs';
  const LOCAL_WORKER_URL = window.CentralPDFEnginePaths?.pdfWorker || 'vendor/pdfjs/pdf.worker.min.mjs';
  const FONT_MAP = {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold',
    TimesRoman: 'TimesRoman',
    TimesRomanBold: 'TimesRomanBold',
    Courier: 'Courier',
    CourierBold: 'CourierBold'
  };

  const state = {
    pages: [],
    activeIndex: 0,
    sources: new Map(),
    sourceSeq: 0,
    objectSeq: 0,
    pageSeq: 0,
    activeTool: 'select',
    selectedObjectId: null,
    zoom: 100,
    scale: 1,
    history: [],
    future: [],
    pendingGesture: null,
    tempCrop: null,
    workerReady: false,
    initialized: false,
    settingsBound: false,
    loadGeneration: 0,
    currentRenderGeneration: 0,
    thumbnailRenderGeneration: 0,
    activeRenderTask: null,
  };

  const $ = selector => document.querySelector(selector);
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function nextPageId() { state.pageSeq += 1; return `ep-${state.pageSeq}`; }
  function nextObjectId() { state.objectSeq += 1; return `eo-${state.objectSeq}`; }
  function nextSourceId() { state.sourceSeq += 1; return `es-${state.sourceSeq}`; }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindStaticUi();
    setTool('select');
    renderEmpty();
  }

  function ensurePageRotationControls() {
    const actions = $('.editor-page-actions');
    if (!actions || $('#editorRotatePageLeft') || typeof actions.insertBefore !== 'function') return;
    const group = document.createElement('span');
    group.className = 'editor-page-rotation-actions';
    group.style.display = 'inline-flex';
    group.style.gap = '6px';
    group.style.flexWrap = 'wrap';
    group.setAttribute('aria-label', 'Rotação da página');
    group.innerHTML = '<button id="editorRotatePageLeft" class="small-button" type="button" title="Girar página 90° para a esquerda">↶ Girar página</button><button id="editorRotatePageRight" class="small-button" type="button" title="Girar página 90° para a direita">↷ Girar página</button>';
    actions.insertBefore(group, $('#editorDuplicatePage') || null);
  }

  function bindStaticUi() {
    ensurePageRotationControls();
    document.querySelectorAll('[data-editor-tool]').forEach(button => {
      button.addEventListener('click', () => setTool(button.dataset.editorTool));
    });
    $('#editorAddText')?.addEventListener('click', () => setTool('text'));
    $('#editorAddImage')?.addEventListener('click', () => $('#editorImageInput')?.click());
    $('#editorImageInput')?.addEventListener('change', event => addImages([...event.target.files]));
    $('#editorAddPdf')?.addEventListener('click', () => $('#editorPdfInput')?.click());
    $('#editorPdfInput')?.addEventListener('change', event => addPdfPages([...event.target.files]));
    $('#editorAddBlank')?.addEventListener('click', addBlankPage);
    $('#editorDuplicatePage')?.addEventListener('click', duplicateCurrentPage);
    $('#editorDeletePage')?.addEventListener('click', deleteCurrentPage);
    $('#editorMovePageUp')?.addEventListener('click', () => moveCurrentPage(-1));
    $('#editorMovePageDown')?.addEventListener('click', () => moveCurrentPage(1));
    $('#editorRotatePageLeft')?.addEventListener('click', () => rotateCurrentPage(-90));
    $('#editorRotatePageRight')?.addEventListener('click', () => rotateCurrentPage(90));
    $('#editorUndo')?.addEventListener('click', undo);
    $('#editorRedo')?.addEventListener('click', redo);
    $('#editorZoom')?.addEventListener('input', event => {
      state.zoom = Number(event.target.value || 100);
      $('#editorZoomValue').textContent = `${state.zoom}%`;
      renderCurrentPage();
    });

    const interaction = $('#editorInteractionCanvas');
    interaction?.addEventListener('pointerdown', handleStagePointerDown);
    interaction?.addEventListener('pointermove', handleStagePointerMove);
    interaction?.addEventListener('pointerup', handleStagePointerUp);
    interaction?.addEventListener('pointercancel', handleStagePointerUp);

    $('#editorObjectLayer')?.addEventListener('pointerdown', event => {
      if (state.activeTool !== 'select') return;
      if (!event.target.closest('.editor-object')) selectObject(null);
    });

    document.addEventListener('keydown', event => {
      const visible = !$('#pdfEditorSection')?.classList.contains('hidden');
      if (!visible) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); event.shiftKey ? redo() : undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); redo();
      } else if (event.key === 'Delete' && state.selectedObjectId && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault(); deleteSelectedObject();
      } else if (state.selectedObjectId && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault(); const object=selectedObject(); if(!object)return; checkpoint(); const step=event.shiftKey?10:1;
        if(event.altKey){object.rotation=normalizeAngle((object.rotation||0)+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-step:step));}
        else{if(event.key==='ArrowLeft')object.x-=step;if(event.key==='ArrowRight')object.x+=step;if(event.key==='ArrowUp')object.y-=step;if(event.key==='ArrowDown')object.y+=step;}
        clampObjectInsidePage(object);renderCurrentPage();updateInspector();
      } else if ((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='d' && state.selectedObjectId && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();duplicateSelectedObject();
      } else if (event.key === 'Escape') {
        state.tempCrop = null; state.pendingGesture = null; selectObject(null); updateEditorPointerRouting(); renderCurrentPage();
      }
    });
  }

  function bindSettings() {
    state.settingsBound = true;
    const ids = [
      'editorTextValue','editorFontFamily','editorFontSize','editorTextColor','editorTextOpacity',
      'editorBold','editorItalic','editorTextAlign','editorBrushColor','editorBrushWidth',
      'editorHighlightColor','editorHighlightWidth','editorCoverColor','editorCoverOpacity'
    ];
    ids.forEach(id => {
      const element = $(`#${id}`);
      if (!element) return;
      const eventName = ['SELECT'].includes(element.tagName) || ['checkbox','color'].includes(element.type) ? 'change' : 'input';
      element.addEventListener(eventName, () => applyInspectorToSelected());
    });
    $('#editorDeleteObject')?.addEventListener('click', deleteSelectedObject);
    $('#editorResetImageRatio')?.addEventListener('click', resetSelectedImageRatio);
    ['editorObjectX','editorObjectY','editorObjectWidth','editorObjectHeight','editorObjectRotation'].forEach(id => {
      $(`#${id}`)?.addEventListener('change', applyObjectTransformFromInspector);
    });
    $('#editorRotateLeft')?.addEventListener('click', () => rotateSelectedObject(-90));
    $('#editorRotateRight')?.addEventListener('click', () => rotateSelectedObject(90));
    $('#editorResetRotation')?.addEventListener('click', () => setSelectedObjectRotation(0));
    $('#editorBringForward')?.addEventListener('click', () => moveSelectedObjectLayer(1));
    $('#editorSendBackward')?.addEventListener('click', () => moveSelectedObjectLayer(-1));
    $('#editorDuplicateObject')?.addEventListener('click', duplicateSelectedObject);
    const alignActions={editorAlignLeft:'left',editorAlignCenterX:'centerX',editorAlignRight:'right',editorAlignTop:'top',editorAlignCenterY:'centerY',editorAlignBottom:'bottom'};
    Object.entries(alignActions).forEach(([id,mode])=>$(`#${id}`)?.addEventListener('click',()=>alignSelectedObject(mode)));
    $('#editorObjectLockAspect')?.addEventListener('change', () => {
      const object = selectedObject(); if (!object) return; object.lockAspect = Boolean($('#editorObjectLockAspect')?.checked);
    });
    $('#editorClearDrawings')?.addEventListener('click', clearDrawingsCurrentPage);
    $('#editorApplyCrop')?.addEventListener('click', applyPendingCrop);
    $('#editorResetCrop')?.addEventListener('click', resetCrop);
    updateInspector();
  }

  function activate() {
    init();
    bindSettings();
    renderCurrentPage();
  }

  function deactivate() {
    state.pendingGesture = null;
    state.currentRenderGeneration += 1;
    cancelActivePageRender();
  }

  function reset() {
    state.currentRenderGeneration += 1;
    state.thumbnailRenderGeneration += 1;
    cancelActivePageRender();
    state.pages = [];
    state.activeIndex = 0;
    state.sources.clear();
    state.selectedObjectId = null;
    state.history = [];
    state.future = [];
    state.tempCrop = null;
    state.pendingGesture = null;
    state.loadGeneration += 1;
    renderEmpty();
    updateHistoryButtons();
    updateInspector();
  }

  async function ensureWorker() {
    if (state.workerReady) return;
    if (window.CentralPDFEnginesReady) await window.CentralPDFEnginesReady.catch(() => null);
    if (window.CentralPDFPdfWorkerReady) await window.CentralPDFPdfWorkerReady.catch(() => null);
    if (!window.pdfjsLib) return;
    const options = window.pdfjsLib.GlobalWorkerOptions;
    if (options && !options.workerPort && !options.workerSrc) options.workerSrc = window.CentralPDFResolvePdfWorker?.() || '';
    state.workerReady = Boolean(options?.workerPort || options?.workerSrc);
  }

  function isEncryptedPdfError(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    return name === 'EncryptedPDFError' || /encrypted|encryption|criptograf/i.test(message);
  }

  function isRenderCancellation(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    return name === 'RenderingCancelledException' || /rendering cancelled/i.test(message);
  }

  function cancelActivePageRender() {
    const task = state.activeRenderTask;
    state.activeRenderTask = null;
    if (!task || typeof task.cancel !== 'function') return;
    try { task.cancel(); } catch (_) {}
  }

  async function loadPdfSource(file, sourceId) {
    const bytes = await file.arrayBuffer();
    const renderedBytes = bytes.slice(0);
    const libraryBytes = bytes.slice(0);
    const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(renderedBytes) });
    const rendered = await loadingTask.promise;
    let pdfLibDoc = null;
    let compatibilityMode = 'native';
    try {
      pdfLibDoc = await window.PDFLib.PDFDocument.load(libraryBytes, { ignoreEncryption: false, updateMetadata: false });
    } catch (error) {
      if (!isEncryptedPdfError(error)) {
        try { await loadingTask.destroy?.(); } catch (_) {}
        throw error;
      }
      compatibilityMode = 'raster';
    }
    return {
      id: sourceId,
      name: file.name,
      file,
      rendered,
      loadingTask,
      pdfLibDoc,
      bytes: libraryBytes,
      compatibilityMode,
      restricted: compatibilityMode === 'raster'
    };
  }

  async function renderPdfPageToCanvas(renderedPage, viewport) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const task = renderedPage.render({ canvasContext: context, viewport });
    await task.promise;
    return canvas;
  }

  async function createRasterizedPdfPage(output, source, model) {
    const renderedPage = await source.rendered.getPage(model.sourceIndex + 1);
    const base = renderedPage.getViewport({ scale: 1, rotation: getPageRenderRotation(model) });
    const scale = Math.max(1, Math.min(2, 2400 / Math.max(base.width, base.height)));
    const viewport = renderedPage.getViewport({ scale, rotation: getPageRenderRotation(model) });
    const canvas = await renderPdfPageToCanvas(renderedPage, viewport);
    const image = await output.embedPng(dataUrlBytes(canvas.toDataURL('image/png')));
    const page = output.addPage([model.width, model.height]);
    page.drawImage(image, { x: 0, y: 0, width: model.width, height: model.height });
    canvas.width = 1;
    canvas.height = 1;
    return page;
  }

  async function loadFile(file) {
    init();
    reset();
    if (!file) return;
    if (!window.PDFLib || !window.pdfjsLib) throw new Error('Os motores PDF não carregaram. Verifique a conexão com a internet.');
    await ensureWorker();
    const generation = ++state.loadGeneration;
    setEditorStatus('Lendo páginas e preparando o editor...', 'processing');
    const sourceId = nextSourceId();
    const source = await loadPdfSource(file, sourceId);
    state.sources.set(sourceId, source);
    for (let index = 0; index < source.rendered.numPages; index++) {
      if (generation !== state.loadGeneration) return;
      const page = await source.rendered.getPage(index + 1);
      const sourceRotation = normalizeAngle(Number(page.rotate || 0));
      const viewport = page.getViewport({ scale: 1, rotation: sourceRotation });
      state.pages.push({
        id: nextPageId(), kind: 'pdf', sourceId, sourceIndex: index,
        width: viewport.width, height: viewport.height, sourceRotation, rotation: 0,
        crop: null, objects: []
      });
    }
    state.activeIndex = 0;
    await renderThumbnails();
    await renderCurrentPage();
    const compatible = source.compatibilityMode === 'raster';
    setEditorStatus(
      compatible
        ? `${state.pages.length} página(s) carregada(s) em modo compatível. O PDF possui restrições internas; a aparência será preservada e o conteúdo-base será achatado somente na exportação.`
        : `${state.pages.length} página(s) carregada(s). Escolha uma ferramenta e edite visualmente.`,
      compatible ? '' : 'success'
    );
    updatePageControls();
    return state.pages.length;
  }

  function currentPage() { return state.pages[state.activeIndex] || null; }

  function getPageRenderRotation(page) {
    return normalizeAngle(Number(page?.sourceRotation || 0) + Number(page?.rotation || 0));
  }

  function pageOrientation(page) {
    const width = Number(page?.width || 0);
    const height = Number(page?.height || 0);
    if (Math.abs(width - height) < 0.5) return 'Quadrado';
    return width > height ? 'Paisagem' : 'Retrato';
  }

  function rotateVisualPoint(point, width, height, delta = 90) {
    const angle = normalizeAngle(delta);
    if (angle === 90) return { x: height - point.y, y: point.x };
    if (angle === 180) return { x: width - point.x, y: height - point.y };
    if (angle === 270) return { x: point.y, y: width - point.x };
    return { x: point.x, y: point.y };
  }

  function rotateVisualRect(rect, width, height, delta = 90) {
    const angle = normalizeAngle(delta);
    if (angle === 90) return { x: height - rect.y - rect.height, y: rect.x, width: rect.height, height: rect.width };
    if (angle === 180) return { x: width - rect.x - rect.width, y: height - rect.y - rect.height, width: rect.width, height: rect.height };
    if (angle === 270) return { x: rect.y, y: width - rect.x - rect.width, width: rect.height, height: rect.width };
    return { ...rect };
  }

  function rotatePageGeometry(page, delta = 90) {
    const steps = Math.round(normalizeAngle(delta) / 90) % 4;
    for (let step = 0; step < steps; step++) {
      const width = page.width;
      const height = page.height;
      page.objects.forEach(object => {
        if (object.type === 'path' && Array.isArray(object.points)) {
          object.points = object.points.map(point => rotateVisualPoint(point, width, height, 90));
          return;
        }
        const center = rotateVisualPoint({ x: object.x + object.width / 2, y: object.y + object.height / 2 }, width, height, 90);
        object.x = center.x - object.width / 2;
        object.y = center.y - object.height / 2;
        object.rotation = normalizeAngle(Number(object.rotation || 0) + 90);
      });
      if (page.crop) page.crop = rotateVisualRect(page.crop, width, height, 90);
      if (page === currentPage() && state.tempCrop) state.tempCrop = rotateVisualRect(state.tempCrop, width, height, 90);
      page.width = height;
      page.height = width;
      page.rotation = normalizeAngle(Number(page.rotation || 0) + 90);
      page.objects.forEach(object => object.type === 'path' || clampObjectInsidePage(object, page));
    }
    return page;
  }

  function rotateCurrentPage(delta) {
    const page = currentPage();
    if (!page) return;
    checkpoint();
    rotatePageGeometry(page, delta);
    renderThumbnails();
    renderCurrentPage();
    updatePageControls();
    updateInspector();
    setEditorStatus(`Página girada. Orientação atual: ${pageOrientation(page)}.`, 'success');
  }

  function checkpoint() {
    state.history.push({ pages: deepClone(state.pages), activeIndex: state.activeIndex, selectedObjectId: state.selectedObjectId });
    if (state.history.length > 40) state.history.shift();
    state.future = [];
    updateHistoryButtons();
  }

  function restoreSnapshot(snapshot) {
    state.pages = deepClone(snapshot.pages);
    state.activeIndex = clamp(snapshot.activeIndex, 0, Math.max(0, state.pages.length - 1));
    state.selectedObjectId = snapshot.selectedObjectId || null;
    state.tempCrop = null;
    renderThumbnails();
    renderCurrentPage();
    updatePageControls();
    updateInspector();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push({ pages: deepClone(state.pages), activeIndex: state.activeIndex, selectedObjectId: state.selectedObjectId });
    restoreSnapshot(state.history.pop());
    updateHistoryButtons();
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push({ pages: deepClone(state.pages), activeIndex: state.activeIndex, selectedObjectId: state.selectedObjectId });
    restoreSnapshot(state.future.pop());
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if ($('#editorUndo')) $('#editorUndo').disabled = !state.history.length;
    if ($('#editorRedo')) $('#editorRedo').disabled = !state.future.length;
  }

  function setTool(tool) {
    state.activeTool = tool;
    state.pendingGesture = null;
    if (tool !== 'select') state.selectedObjectId = null;
    if (tool !== 'crop') state.tempCrop = null;
    document.querySelectorAll('[data-editor-tool]').forEach(button => button.classList.toggle('active', button.dataset.editorTool === tool));
    const labels = {
      select: 'Selecionar e mover objetos', text: 'Clique na página para adicionar texto', brush: 'Desenhe livremente com o pincel',
      highlight: 'Marque trechos com transparência', cover: 'Arraste para cobrir uma área visualmente', crop: 'Arraste para escolher a área visível da página'
    };
    $('#editorToolHint').textContent = labels[tool] || '';
    updateEditorPointerRouting();
    renderCurrentPage(); updateInspector();
  }

  function renderEmpty() {
    const stage = $('#editorStage');
    if (stage) {
      stage.style.width = '680px'; stage.style.height = '480px';
      stage.classList.add('empty');
    }
    const base = $('#editorBaseCanvas');
    if (base) { base.width = 680; base.height = 480; const ctx = base.getContext('2d'); ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0,0,680,480); }
    const layer = $('#editorObjectLayer'); if (layer) layer.innerHTML = '<div class="editor-empty-message"><strong>Adicione um PDF para começar</strong><span>O editor aparecerá aqui.</span></div>';
    const interaction = $('#editorInteractionCanvas'); if (interaction) { interaction.width = 680; interaction.height = 480; }
    const thumbs = $('#editorThumbnailList'); if (thumbs) thumbs.innerHTML = '<div class="editor-thumb-empty">Nenhuma página</div>';
    if ($('#editorPageIndicator')) $('#editorPageIndicator').textContent = '0 / 0';
    updatePageControls();
  }

  async function renderCurrentPage() {
    const generation = ++state.currentRenderGeneration;
    cancelActivePageRender();
    const page = currentPage();
    if (!page) { renderEmpty(); return; }
    const stage = $('#editorStage');
    stage.classList.remove('empty');
    stage.classList.toggle('crop-adjusting', Boolean(state.tempCrop));
    let renderedPage = null;
    let displayWidth = page.width;
    let displayHeight = page.height;
    const renderRotation = getPageRenderRotation(page);
    if (page.kind === 'pdf') {
      const source = state.sources.get(page.sourceId);
      renderedPage = await source.rendered.getPage(page.sourceIndex + 1);
      if (generation !== state.currentRenderGeneration) return;
      const baseViewport = renderedPage.getViewport({ scale: 1, rotation: renderRotation });
      displayWidth = baseViewport.width;
      displayHeight = baseViewport.height;
    }
    const viewportLimitW = 860;
    const viewportLimitH = 1020;
    const fit = Math.min(viewportLimitW / displayWidth, viewportLimitH / displayHeight, 1.45);
    state.scale = fit * (state.zoom / 100);
    const cssWidth = Math.max(160, Math.round(displayWidth * state.scale));
    const cssHeight = Math.max(160, Math.round(displayHeight * state.scale));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let renderCanvas = null;
    if (renderedPage) {
      const viewport = renderedPage.getViewport({ scale: state.scale * dpr, rotation: renderRotation });
      renderCanvas = document.createElement('canvas');
      renderCanvas.width = Math.max(1, Math.ceil(viewport.width));
      renderCanvas.height = Math.max(1, Math.ceil(viewport.height));
      const renderContext = renderCanvas.getContext('2d', { alpha: false });
      renderContext.fillStyle = '#fff';
      renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      const task = renderedPage.render({ canvasContext: renderContext, viewport });
      state.activeRenderTask = task;
      try {
        await task.promise;
      } catch (error) {
        if (isRenderCancellation(error)) return;
        throw error;
      } finally {
        if (state.activeRenderTask === task) state.activeRenderTask = null;
      }
      if (generation !== state.currentRenderGeneration) return;
    }
    if (generation !== state.currentRenderGeneration) return;
    stage.style.width = `${cssWidth}px`;
    stage.style.height = `${cssHeight}px`;
    const base = $('#editorBaseCanvas');
    const pixelWidth = renderCanvas?.width || Math.round(cssWidth * dpr);
    const pixelHeight = renderCanvas?.height || Math.round(cssHeight * dpr);
    base.style.width = `${cssWidth}px`;
    base.style.height = `${cssHeight}px`;
    base.width = pixelWidth;
    base.height = pixelHeight;
    const baseCtx = base.getContext('2d', { alpha: false });
    baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    baseCtx.fillStyle = '#fff';
    baseCtx.fillRect(0, 0, base.width, base.height);
    if (renderCanvas) {
      baseCtx.drawImage(renderCanvas, 0, 0, base.width, base.height);
      renderCanvas.width = 1;
      renderCanvas.height = 1;
    }
    const interaction = $('#editorInteractionCanvas');
    interaction.width = base.width; interaction.height = base.height;
    interaction.style.width = base.style.width; interaction.style.height = base.style.height;
    const layer = $('#editorObjectLayer');
    layer.style.width = base.style.width; layer.style.height = base.style.height;
    renderObjects();
    drawVectorObjects();
    drawCropOverlay();
    $('#editorPageIndicator').textContent = `${state.activeIndex + 1} / ${state.pages.length}`;
    $('#editorCurrentPageInfo').textContent = `Página ${state.activeIndex + 1} • ${Math.round(displayWidth)} × ${Math.round(displayHeight)} pt • ${pageOrientation({ width: displayWidth, height: displayHeight })}${page.crop ? ' • recortada' : ''}`;
    updatePageControls();
  }

  function updateEditorPointerRouting() {
    const cropAdjustMode = state.activeTool === 'crop' && Boolean(state.tempCrop);
    const objectMode = state.activeTool === 'select' || cropAdjustMode;
    const interaction = $('#editorInteractionCanvas');
    if (interaction) interaction.style.pointerEvents = objectMode ? 'none' : 'auto';
    const layer = $('#editorObjectLayer');
    if (layer) layer.style.pointerEvents = objectMode ? 'auto' : 'none';
  }

  function renderObjects() {
    const page = currentPage();
    const layer = $('#editorObjectLayer');
    layer.innerHTML = '';
    if (!page) return;
    page.objects.filter(object => ['text','image','cover'].includes(object.type)).forEach(object => {
      let element;
      if (object.type === 'text') {
        element = document.createElement('div');
        element.className = 'editor-object editor-text-object';
        const content = document.createElement('div');
        content.className = 'editor-text-content';
        content.textContent = object.text;
        content.style.fontFamily = browserFont(object.fontFamily);
        content.style.fontSize = `${object.fontSize * state.scale}px`;
        content.style.fontWeight = object.bold ? '700' : '400';
        content.style.fontStyle = object.italic ? 'italic' : 'normal';
        content.style.color = object.color;
        content.style.opacity = String(object.opacity ?? 1);
        content.style.textAlign = object.align || 'left';
        content.style.lineHeight = '1.2';
        content.addEventListener('dblclick', event => {
          event.stopPropagation(); selectObject(object.id); content.contentEditable = 'true'; content.focus();
          const range = document.createRange(); range.selectNodeContents(content); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        });
        content.addEventListener('blur', () => {
          if (content.contentEditable === 'true') { checkpoint(); object.text = content.innerText || ' '; content.contentEditable = 'false'; updateInspector(); renderCurrentPage(); }
        });
        element.appendChild(content);
      } else if (object.type === 'image') {
        element = document.createElement('div');
        element.className = 'editor-object editor-image-object';
        const image = document.createElement('img');
        image.className = 'editor-image-content';
        image.src = object.dataUrl;
        image.alt = 'Imagem adicionada';
        image.draggable = false;
        element.appendChild(image);
      } else {
        element = document.createElement('div');
        element.className = 'editor-object editor-cover-object';
        const content = document.createElement('div');
        content.className = 'editor-cover-content';
        content.style.background = object.color || '#ffffff';
        content.style.opacity = String(object.opacity ?? 1);
        element.appendChild(content);
      }
      element.dataset.objectId = object.id;
      element.style.left = `${object.x * state.scale}px`;
      element.style.top = `${object.y * state.scale}px`;
      element.style.width = `${object.width * state.scale}px`;
      element.style.height = `${object.height * state.scale}px`;
      element.style.transform = `rotate(${normalizeAngle(object.rotation || 0)}deg)`;
      element.style.transformOrigin = 'center center';
      element.classList.toggle('selected', state.selectedObjectId === object.id);
      element.addEventListener('pointerdown', event => startObjectDrag(event, object));
      element.addEventListener('click', event => { event.stopPropagation(); selectObject(object.id); });
      if (state.selectedObjectId === object.id) appendTransformControls(element, object);
      layer.appendChild(element);
    });
    if (state.tempCrop) appendCropTransformControls(layer);
    updateEditorPointerRouting();
  }

  function appendCropTransformControls(layer) {
    const crop = state.tempCrop; if (!crop) return;
    const element = document.createElement('div');
    element.className = 'editor-crop-selection';
    element.style.left = `${crop.x*state.scale}px`;
    element.style.top = `${crop.y*state.scale}px`;
    element.style.width = `${crop.width*state.scale}px`;
    element.style.height = `${crop.height*state.scale}px`;
    const label = document.createElement('span'); label.className='editor-crop-selection-label'; label.textContent='Área que será mantida'; element.appendChild(label);
    Object.keys(TRANSFORM_HANDLES).forEach(position=>{const handle=document.createElement('span');handle.className=`editor-transform-handle handle-${position}`;handle.addEventListener('pointerdown',event=>startCropResize(event,position));element.appendChild(handle);});
    element.addEventListener('pointerdown',startCropDrag);
    layer.appendChild(element);
  }

  function startCropDrag(event) {
    if (event.target.closest('.editor-transform-handle')) return;
    event.preventDefault(); event.stopPropagation();
    const crop=state.tempCrop; if(!crop)return; const start={x:event.clientX,y:event.clientY,ox:crop.x,oy:crop.y}; const page=currentPage();
    const move=moveEvent=>{crop.x=clamp(start.ox+(moveEvent.clientX-start.x)/state.scale,0,Math.max(0,page.width-crop.width));crop.y=clamp(start.oy+(moveEvent.clientY-start.y)/state.scale,0,Math.max(0,page.height-crop.height));renderObjects();drawCropOverlay();};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderCurrentPage();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }

  function startCropResize(event,position) {
    event.preventDefault();event.stopPropagation();const crop=state.tempCrop,page=currentPage();if(!crop||!page)return;
    const direction=TRANSFORM_HANDLES[position]||TRANSFORM_HANDLES.se;const start={x:crop.x,y:crop.y,width:crop.width,height:crop.height};
    const opposite={x:direction.x<0?start.x+start.width:direction.x>0?start.x:start.x+start.width/2,y:direction.y<0?start.y+start.height:direction.y>0?start.y:start.y+start.height/2};
    const move=moveEvent=>{const pointer=rawStagePoint(moveEvent);let left=start.x,top=start.y,right=start.x+start.width,bottom=start.y+start.height;if(direction.x<0)left=clamp(pointer.x,0,right-10);if(direction.x>0)right=clamp(pointer.x,left+10,page.width);if(direction.y<0)top=clamp(pointer.y,0,bottom-10);if(direction.y>0)bottom=clamp(pointer.y,top+10,page.height);crop.x=left;crop.y=top;crop.width=right-left;crop.height=bottom-top;renderObjects();drawCropOverlay();};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderCurrentPage();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }

  function drawVectorObjects(extra) {
    const page = currentPage();
    const canvas = $('#editorInteractionCanvas');
    if (!page || !canvas) return;
    const dpr = canvas.width / Math.max(1, parseFloat(canvas.style.width));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(dpr * state.scale,0,0,dpr * state.scale,0,0);
    page.objects.filter(object => object.type === 'path').forEach(drawPathObject.bind(null, ctx));
    if (extra?.type === 'path') drawPathObject(ctx, extra);
    if (extra?.type === 'rect') {
      ctx.save(); ctx.strokeStyle = extra.color || '#df3347'; ctx.lineWidth = 1.5 / state.scale; ctx.setLineDash([6/state.scale,4/state.scale]);
      ctx.strokeRect(extra.x, extra.y, extra.width, extra.height); ctx.restore();
    }
  }

  function drawPathObject(ctx, object) {
    if (!object.points?.length) return;
    ctx.save();
    ctx.strokeStyle = object.color; ctx.globalAlpha = object.opacity ?? 1;
    ctx.lineWidth = object.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(object.points[0].x, object.points[0].y);
    object.points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke(); ctx.restore();
  }

  function drawCropOverlay() {
    const page = currentPage();
    if (!page) return;
    if (state.tempCrop) drawVectorObjects({ type:'rect', ...state.tempCrop, color:'#df3347' });
    const badge = $('#editorCropBadge');
    if (page.crop) {
      badge.classList.remove('hidden');
      badge.textContent = `Recorte aplicado: ${Math.round(page.crop.width)} × ${Math.round(page.crop.height)} pt`;
    } else badge.classList.add('hidden');
  }

  function stagePoint(event) {
    const rect = $('#editorStage').getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / state.scale, 0, currentPage()?.width || 0),
      y: clamp((event.clientY - rect.top) / state.scale, 0, currentPage()?.height || 0)
    };
  }

  function handleStagePointerDown(event) {
    const page = currentPage(); if (!page) return;
    const point = stagePoint(event);
    if (state.activeTool === 'text') {
      checkpoint();
      const object = {
        id: nextObjectId(), type:'text', x: point.x, y: point.y, width: 190, height: 44, rotation: 0,
        text: $('#editorTextValue')?.value || 'Digite seu texto', fontFamily: $('#editorFontFamily')?.value || 'Helvetica',
        fontSize: Number($('#editorFontSize')?.value || 16), color: $('#editorTextColor')?.value || '#202735',
        opacity: Number($('#editorTextOpacity')?.value || 100)/100, bold: Boolean($('#editorBold')?.checked),
        italic: Boolean($('#editorItalic')?.checked), align: $('#editorTextAlign')?.value || 'left'
      };
      clampObjectInsidePage(object,page); page.objects.push(object); state.selectedObjectId = object.id; setTool('select'); renderCurrentPage(); updateInspector();
      return;
    }
    if (['brush','highlight'].includes(state.activeTool)) {
      checkpoint();
      const object = { id:nextObjectId(), type:'path', kind:state.activeTool, points:[point],
        color: state.activeTool === 'brush' ? ($('#editorBrushColor')?.value || '#1f2937') : ($('#editorHighlightColor')?.value || '#fff176'),
        width: Number(state.activeTool === 'brush' ? ($('#editorBrushWidth')?.value || 3) : ($('#editorHighlightWidth')?.value || 16)),
        opacity: state.activeTool === 'brush' ? 1 : .38 };
      state.pendingGesture = { kind:'path', object };
      event.currentTarget.setPointerCapture(event.pointerId);
      drawVectorObjects(object); return;
    }
    if (['cover','crop'].includes(state.activeTool)) {
      checkpoint();
      state.pendingGesture = { kind:state.activeTool, start:point, current:point };
      event.currentTarget.setPointerCapture(event.pointerId);
      drawVectorObjects({ type:'rect', x:point.x,y:point.y,width:0,height:0,color:state.activeTool==='crop'?'#df3347':($('#editorCoverColor')?.value||'#ffffff') });
    }
  }

  function handleStagePointerMove(event) {
    if (!state.pendingGesture) return;
    const point = stagePoint(event);
    if (state.pendingGesture.kind === 'path') {
      state.pendingGesture.object.points.push(point); drawVectorObjects(state.pendingGesture.object);
    } else {
      state.pendingGesture.current = point; const rect = normalizedRect(state.pendingGesture.start, point);
      drawVectorObjects({ type:'rect', ...rect, color:state.pendingGesture.kind==='crop'?'#df3347':($('#editorCoverColor')?.value||'#ffffff') });
    }
  }

  function handleStagePointerUp(event) {
    const gesture = state.pendingGesture; if (!gesture) return;
    state.pendingGesture = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) {}
    const page = currentPage();
    if (gesture.kind === 'path') {
      if (gesture.object.points.length > 1) page.objects.push(gesture.object);
      else state.history.pop();
    } else {
      const rect = normalizedRect(gesture.start, gesture.current);
      if (rect.width < 3 || rect.height < 3) { state.history.pop(); renderCurrentPage(); return; }
      if (gesture.kind === 'cover') {
        const object = { id:nextObjectId(), type:'cover', ...rect, rotation:0, color:$('#editorCoverColor')?.value||'#ffffff', opacity:Number($('#editorCoverOpacity')?.value||100)/100 };
        clampObjectInsidePage(object,page); page.objects.push(object); state.selectedObjectId = object.id; setTool('select');
      } else {
        state.tempCrop = rect;
        updateEditorPointerRouting();
        setEditorStatus('Área de recorte selecionada. Clique em “Aplicar recorte” para confirmar.', '');
      }
    }
    renderCurrentPage(); updateHistoryButtons(); updateInspector();
  }

  function normalizedRect(a,b) {
    return { x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), width:Math.abs(a.x-b.x), height:Math.abs(a.y-b.y) };
  }

  const TRANSFORM_HANDLES = {
    nw:{x:-1,y:-1}, n:{x:0,y:-1}, ne:{x:1,y:-1},
    e:{x:1,y:0}, se:{x:1,y:1}, s:{x:0,y:1},
    sw:{x:-1,y:1}, w:{x:-1,y:0}
  };

  function appendTransformControls(element, object) {
    const line = document.createElement('span');
    line.className = 'editor-rotate-line';
    element.appendChild(line);
    const rotate = document.createElement('button');
    rotate.type = 'button';
    rotate.className = 'editor-rotate-handle';
    rotate.title = 'Arraste para girar';
    rotate.setAttribute('aria-label', 'Girar objeto');
    rotate.addEventListener('pointerdown', event => startObjectRotate(event, object));
    element.appendChild(rotate);
    Object.keys(TRANSFORM_HANDLES).forEach(position => {
      const handle = document.createElement('span');
      handle.className = `editor-transform-handle handle-${position}`;
      handle.dataset.handle = position;
      handle.addEventListener('pointerdown', event => startObjectResize(event, object, position));
      element.appendChild(handle);
    });
  }

  function rawStagePoint(event) {
    const rect = $('#editorStage').getBoundingClientRect();
    return { x:(event.clientX-rect.left)/state.scale, y:(event.clientY-rect.top)/state.scale };
  }

  function rotateVector(vector, angleDegrees) {
    const angle = angleDegrees * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x:vector.x*cos-vector.y*sin, y:vector.x*sin+vector.y*cos };
  }

  function rotatePoint(point, center, angleDegrees) {
    const rotated = rotateVector({x:point.x-center.x,y:point.y-center.y}, angleDegrees);
    return {x:center.x+rotated.x,y:center.y+rotated.y};
  }

  function normalizeAngle(value) {
    const angle = Number(value || 0) % 360;
    return angle < 0 ? angle + 360 : angle;
  }

  function signedAngle(value) {
    const angle = normalizeAngle(value);
    return angle > 180 ? angle - 360 : angle;
  }

  function objectMinimumSize(object) {
    if (object?.type === 'text') return {width:40,height:20};
    if (object?.type === 'cover') return {width:10,height:10};
    return {width:20,height:16};
  }

  function clampObjectInsidePage(object, page=currentPage()) {
    if (!object || !page) return object;
    const angle = normalizeAngle(object.rotation || 0) * Math.PI / 180;
    const halfW = object.width/2, halfH = object.height/2;
    const extentX = Math.abs(Math.cos(angle))*halfW + Math.abs(Math.sin(angle))*halfH;
    const extentY = Math.abs(Math.sin(angle))*halfW + Math.abs(Math.cos(angle))*halfH;
    let centerX = object.x + halfW;
    let centerY = object.y + halfH;
    if (extentX*2 <= page.width) centerX = clamp(centerX, extentX, page.width-extentX);
    else centerX = page.width/2;
    if (extentY*2 <= page.height) centerY = clamp(centerY, extentY, page.height-extentY);
    else centerY = page.height/2;
    object.x = centerX-halfW;
    object.y = centerY-halfH;
    return object;
  }

  function startObjectDrag(event, object) {
    if (state.activeTool !== 'select' || event.target.closest('.editor-transform-handle, .editor-rotate-handle') || event.target.closest('[contenteditable="true"]')) return;
    event.preventDefault(); event.stopPropagation(); selectObject(object.id); checkpoint();
    const start = { x:event.clientX, y:event.clientY, ox:object.x, oy:object.y };
    const move = moveEvent => {
      object.x = start.ox + (moveEvent.clientX-start.x)/state.scale;
      object.y = start.oy + (moveEvent.clientY-start.y)/state.scale;
      clampObjectInsidePage(object);
      renderObjects();
      updateInspectorTransformFields(object);
    };
    const up = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); renderCurrentPage(); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  }

  function startObjectResize(event, object, position='se') {
    event.preventDefault(); event.stopPropagation(); selectObject(object.id); checkpoint();
    const direction = TRANSFORM_HANDLES[position] || TRANSFORM_HANDLES.se;
    const page = currentPage();
    const start = {width:object.width,height:object.height,rotation:normalizeAngle(object.rotation||0)};
    const center = {x:object.x+object.width/2,y:object.y+object.height/2};
    const fixedLocal = {
      x: direction.x ? -direction.x*start.width/2 : 0,
      y: direction.y ? -direction.y*start.height/2 : 0
    };
    const fixedWorldOffset = rotateVector(fixedLocal,start.rotation);
    const fixedWorld = {x:center.x+fixedWorldOffset.x,y:center.y+fixedWorldOffset.y};
    const ratio = object.aspectRatio || start.width/Math.max(1,start.height);
    const minimum = objectMinimumSize(object);
    const move = moveEvent => {
      const pointer = rawStagePoint(moveEvent);
      const local = rotateVector({x:pointer.x-fixedWorld.x,y:pointer.y-fixedWorld.y},-start.rotation);
      let width = direction.x ? Math.max(minimum.width,Math.abs(local.x)) : start.width;
      let height = direction.y ? Math.max(minimum.height,Math.abs(local.y)) : start.height;
      const lockAspect = Boolean($('#editorObjectLockAspect')?.checked || moveEvent.shiftKey);
      if (lockAspect) {
        if (direction.x && direction.y) {
          const byWidth = Math.abs(width-start.width)/Math.max(1,start.width) >= Math.abs(height-start.height)/Math.max(1,start.height);
          if (byWidth) height = width/ratio; else width = height*ratio;
        } else if (direction.x) height = width/ratio;
        else if (direction.y) width = height*ratio;
      }
      width = Math.max(minimum.width,width); height = Math.max(minimum.height,height);
      const handleVector = {x:direction.x ? direction.x*width : 0,y:direction.y ? direction.y*height : 0};
      const centerOffset = rotateVector({x:handleVector.x/2,y:handleVector.y/2},start.rotation);
      let nextCenter = {x:fixedWorld.x+centerOffset.x,y:fixedWorld.y+centerOffset.y};
      if (!direction.x) nextCenter.x = center.x;
      if (!direction.y) nextCenter.y = center.y;
      object.width = width; object.height = height;
      object.x = nextCenter.x-width/2; object.y = nextCenter.y-height/2;
      clampObjectInsidePage(object,page);
      renderObjects(); updateInspectorTransformFields(object);
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderCurrentPage();updateInspector();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }

  function startObjectRotate(event, object) {
    event.preventDefault(); event.stopPropagation(); selectObject(object.id); checkpoint();
    const rect = $('#editorStage').getBoundingClientRect();
    const center = {
      x:rect.left+(object.x+object.width/2)*state.scale,
      y:rect.top+(object.y+object.height/2)*state.scale
    };
    const pointerAngle = e => Math.atan2(e.clientY-center.y,e.clientX-center.x)*180/Math.PI;
    const startPointerAngle = pointerAngle(event);
    const startRotation = normalizeAngle(object.rotation||0);
    const move = moveEvent => {
      let angle = startRotation + pointerAngle(moveEvent)-startPointerAngle;
      const snap = moveEvent.shiftKey ? 15 : 1;
      angle = Math.round(angle/snap)*snap;
      object.rotation = normalizeAngle(angle);
      clampObjectInsidePage(object);
      renderObjects(); updateInspectorTransformFields(object);
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderCurrentPage();updateInspector();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }

  function selectObject(id) {
    state.selectedObjectId = id;
    renderObjects(); updateInspector();
  }

  function selectedObject() {
    return currentPage()?.objects.find(object => object.id === state.selectedObjectId) || null;
  }

  function updateInspector() {
    const object = selectedObject();
    const panel = $('#editorSelectionPanel'); if (!panel) return;
    panel.classList.toggle('inactive', !object);
    $('#editorSelectedType').textContent = object ? objectLabel(object) : 'Nenhum objeto selecionado';
    const sizePanel = $('#editorObjectSizePanel');
    const supportsTransform = Boolean(object && ['text','image','cover'].includes(object.type));
    const showTextControls = object?.type === 'text' || (!object && state.activeTool === 'text');
    $('#editorTextControlsPanel')?.classList.toggle('hidden', !showTextControls);
    sizePanel?.classList.toggle('hidden', !supportsTransform);
    $('#editorAspectRow')?.classList.toggle('hidden', !supportsTransform);
    $('#editorResetImageRatio')?.classList.toggle('hidden', object?.type !== 'image');
    if (supportsTransform) {
      if ($('#editorObjectLockAspect')) $('#editorObjectLockAspect').checked = object.type === 'image' ? (object.lockAspect ?? true) : Boolean(object.lockAspect);
      updateInspectorTransformFields(object);
    }
    if (object?.type === 'text') {
      $('#editorTextValue').value = object.text;
      $('#editorFontFamily').value = object.fontFamily || 'Helvetica';
      $('#editorFontSize').value = object.fontSize || 16;
      $('#editorTextColor').value = normalizeHex(object.color || '#202735');
      $('#editorTextOpacity').value = Math.round((object.opacity ?? 1)*100);
      $('#editorBold').checked = Boolean(object.bold); $('#editorItalic').checked = Boolean(object.italic);
      $('#editorTextAlign').value = object.align || 'left';
    }
    const textControls = document.querySelectorAll('[data-editor-text-control]');
    textControls.forEach(control => control.disabled = Boolean(object && object.type !== 'text'));
    ['editorDeleteObject','editorDuplicateObject','editorBringForward','editorSendBackward','editorRotateLeft','editorRotateRight','editorResetRotation','editorAlignLeft','editorAlignCenterX','editorAlignRight','editorAlignTop','editorAlignCenterY','editorAlignBottom'].forEach(id => {
      const control = $(`#${id}`); if (control) control.disabled = !supportsTransform;
    });
  }

  function updateInspectorTransformFields(object) {
    const values = {
      editorObjectX:object.x,
      editorObjectY:object.y,
      editorObjectWidth:object.width,
      editorObjectHeight:object.height,
      editorObjectRotation:signedAngle(object.rotation||0)
    };
    Object.entries(values).forEach(([id,value])=>{const input=$(`#${id}`);if(input)input.value=String(Math.round(value||0));});
  }

  function applyObjectTransformFromInspector(event) {
    const object = selectedObject();
    if (!object || !['text','image','cover'].includes(object.type)) return;
    const page = currentPage();
    const oldWidth = object.width, oldHeight = object.height;
    let x = Number($('#editorObjectX')?.value ?? object.x);
    let y = Number($('#editorObjectY')?.value ?? object.y);
    let width = Math.max(objectMinimumSize(object).width,Number($('#editorObjectWidth')?.value || object.width));
    let height = Math.max(objectMinimumSize(object).height,Number($('#editorObjectHeight')?.value || object.height));
    const lockAspect = Boolean($('#editorObjectLockAspect')?.checked);
    const ratio = object.aspectRatio || oldWidth/Math.max(1,oldHeight);
    if (lockAspect) {
      if (event?.target?.id === 'editorObjectHeight') width = height*ratio;
      else if (event?.target?.id === 'editorObjectWidth') height = width/ratio;
    }
    checkpoint();
    object.x = Number.isFinite(x)?x:object.x; object.y = Number.isFinite(y)?y:object.y;
    object.width = width; object.height = height;
    object.rotation = normalizeAngle(Number($('#editorObjectRotation')?.value || 0));
    object.lockAspect = lockAspect;
    clampObjectInsidePage(object,page);
    renderCurrentPage(); updateInspector();
  }

  function rotateSelectedObject(delta) {
    const object=selectedObject(); if(!object)return;
    checkpoint(); object.rotation=normalizeAngle((object.rotation||0)+delta); clampObjectInsidePage(object); renderCurrentPage(); updateInspector();
  }

  function setSelectedObjectRotation(angle) {
    const object=selectedObject(); if(!object)return;
    checkpoint(); object.rotation=normalizeAngle(angle); clampObjectInsidePage(object); renderCurrentPage(); updateInspector();
  }

  function alignSelectedObject(mode) {
    const object=selectedObject(),page=currentPage();if(!object||!page)return;
    const angle=normalizeAngle(object.rotation||0)*Math.PI/180;const halfW=object.width/2,halfH=object.height/2;
    const extentX=Math.abs(Math.cos(angle))*halfW+Math.abs(Math.sin(angle))*halfH;
    const extentY=Math.abs(Math.sin(angle))*halfW+Math.abs(Math.cos(angle))*halfH;
    let centerX=object.x+halfW,centerY=object.y+halfH;
    if(mode==='left')centerX=extentX;if(mode==='centerX')centerX=page.width/2;if(mode==='right')centerX=page.width-extentX;
    if(mode==='top')centerY=extentY;if(mode==='centerY')centerY=page.height/2;if(mode==='bottom')centerY=page.height-extentY;
    checkpoint();object.x=centerX-halfW;object.y=centerY-halfH;clampObjectInsidePage(object,page);renderCurrentPage();updateInspector();
  }

  function moveSelectedObjectLayer(direction) {
    const page=currentPage(), object=selectedObject(); if(!page||!object)return;
    const index=page.objects.findIndex(item=>item.id===object.id); const target=clamp(index+direction,0,page.objects.length-1);
    if(index===target)return; checkpoint(); page.objects.splice(index,1); page.objects.splice(target,0,object); renderCurrentPage(); updateInspector();
  }

  function duplicateSelectedObject() {
    const page=currentPage(), object=selectedObject(); if(!page||!object)return;
    checkpoint(); const copy=deepClone(object); copy.id=nextObjectId(); copy.x+=12; copy.y+=12; clampObjectInsidePage(copy,page);
    const index=page.objects.findIndex(item=>item.id===object.id); page.objects.splice(index+1,0,copy); state.selectedObjectId=copy.id; renderCurrentPage(); updateInspector();
  }

  function resetSelectedImageRatio() {
    const object = selectedObject();
    if (!object || object.type !== 'image') return;
    const page = currentPage();
    const ratio = object.aspectRatio || 1;
    checkpoint();
    let width = object.width;
    let height = width / ratio;
    const maxHeight = Math.max(16, (page?.height || height) - object.y);
    if (height > maxHeight) { height = maxHeight; width = height * ratio; }
    object.width = Math.max(20, width);
    object.height = Math.max(16, height);
    object.lockAspect = true;
    renderCurrentPage();
    updateInspector();
  }

  function applyInspectorToSelected() {
    const object = selectedObject();
    if (!object) return;
    if (object.type === 'text') {
      checkpoint();
      object.text = $('#editorTextValue')?.value || ' ';
      object.fontFamily = $('#editorFontFamily')?.value || 'Helvetica';
      object.fontSize = Number($('#editorFontSize')?.value || 16);
      object.color = $('#editorTextColor')?.value || '#202735';
      object.opacity = Number($('#editorTextOpacity')?.value || 100)/100;
      object.bold = Boolean($('#editorBold')?.checked); object.italic = Boolean($('#editorItalic')?.checked);
      object.align = $('#editorTextAlign')?.value || 'left';
      renderCurrentPage();
    } else if (object.type === 'cover') {
      checkpoint(); object.color = $('#editorCoverColor')?.value || '#ffffff'; object.opacity = Number($('#editorCoverOpacity')?.value || 100)/100; renderCurrentPage();
    }
  }

  function objectLabel(object) {
    return ({text:'Texto',image:'Imagem',cover:'Cobertura visual',path:object.kind==='highlight'?'Marcador':'Pincel'})[object.type] || 'Objeto';
  }

  function deleteSelectedObject() {
    const page=currentPage(); if(!page||!state.selectedObjectId)return;
    checkpoint(); page.objects=page.objects.filter(object=>object.id!==state.selectedObjectId); state.selectedObjectId=null; renderCurrentPage(); updateInspector();
  }

  function clearDrawingsCurrentPage() {
    const page=currentPage(); if(!page)return;
    const has=page.objects.some(object=>object.type==='path'); if(!has)return;
    checkpoint(); page.objects=page.objects.filter(object=>object.type!=='path'); renderCurrentPage();
  }

  function applyPendingCrop() {
    const page=currentPage(); if(!page||!state.tempCrop){setEditorStatus('Selecione uma área com a ferramenta Recortar.', 'error');return;}
    checkpoint(); page.crop={...state.tempCrop}; state.tempCrop=null; updateEditorPointerRouting(); setTool('select'); renderCurrentPage(); renderThumbnails(); setEditorStatus('Recorte aplicado à página atual.', 'success');
  }

  function resetCrop() {
    const page=currentPage(); if(!page||!page.crop)return;
    checkpoint(); page.crop=null; state.tempCrop=null; updateEditorPointerRouting(); renderCurrentPage(); renderThumbnails();
  }

  async function addImages(files) {
    const valid=files.filter(file=>file.type.startsWith('image/')); if(!valid.length)return;
    const page=currentPage(); if(!page)return;
    checkpoint();
    for(const file of valid){
      const dataUrl=await imageFileToPngDataUrl(file); const dimensions=await imageDimensions(dataUrl);
      const maxW=Math.min(page.width*.55,dimensions.width); const ratio=dimensions.height/dimensions.width;
      const width=Math.max(40,maxW), height=Math.max(30,width*ratio);
      const object={id:nextObjectId(),type:'image',x:(page.width-width)/2,y:(page.height-height)/2,width,height,rotation:0,lockAspect:true,aspectRatio:dimensions.width/Math.max(1,dimensions.height),dataUrl,mime:'image/png'};
      clampObjectInsidePage(object,page); page.objects.push(object); state.selectedObjectId=object.id;
    }
    $('#editorImageInput').value=''; setTool('select'); renderCurrentPage(); updateInspector();
  }

  async function addPdfPages(files) {
    if(!files.length)return; if(!window.pdfjsLib||!window.PDFLib)throw new Error('Motores PDF indisponíveis.');
    checkpoint(); let insertAt=state.activeIndex+1; let compatibleCount=0;
    for(const file of files){
      const sourceId=nextSourceId();
      const source=await loadPdfSource(file,sourceId);
      state.sources.set(sourceId,source);
      if(source.compatibilityMode==='raster')compatibleCount+=1;
      const additions=[];
      for(let index=0;index<source.rendered.numPages;index++){
        const p=await source.rendered.getPage(index+1); const sourceRotation=normalizeAngle(Number(p.rotate||0)); const v=p.getViewport({scale:1,rotation:sourceRotation});
        additions.push({id:nextPageId(),kind:'pdf',sourceId,sourceIndex:index,width:v.width,height:v.height,sourceRotation,rotation:0,crop:null,objects:[]});
      }
      state.pages.splice(insertAt,0,...additions); insertAt+=additions.length;
    }
    $('#editorPdfInput').value=''; await renderThumbnails(); await renderCurrentPage(); updatePageControls();
    setEditorStatus(compatibleCount ? 'Páginas adicionadas em modo compatível. PDFs com restrições serão achatados somente na exportação.' : 'Páginas de outro PDF adicionadas ao documento.', compatibleCount ? '' : 'success');
  }

  function addBlankPage() {
    const page=currentPage(); const width=page?.width||595.28,height=page?.height||841.89;
    checkpoint(); const blank={id:nextPageId(),kind:'blank',width,height,sourceRotation:0,rotation:0,crop:null,objects:[]};
    state.pages.splice(state.activeIndex+1,0,blank); state.activeIndex+=1; renderThumbnails(); renderCurrentPage(); updatePageControls();
  }

  function duplicateCurrentPage() {
    const page=currentPage(); if(!page)return; checkpoint(); const copy=deepClone(page); copy.id=nextPageId(); copy.objects.forEach(object=>object.id=nextObjectId());
    state.pages.splice(state.activeIndex+1,0,copy); state.activeIndex+=1; renderThumbnails(); renderCurrentPage(); updatePageControls();
  }

  function deleteCurrentPage() {
    if(state.pages.length<=1){setEditorStatus('O documento precisa manter pelo menos uma página.');return;}
    checkpoint(); state.pages.splice(state.activeIndex,1); state.activeIndex=clamp(state.activeIndex,0,state.pages.length-1); state.selectedObjectId=null; renderThumbnails(); renderCurrentPage(); updatePageControls();
  }

  function moveCurrentPage(direction) {
    const target=state.activeIndex+direction; if(target<0||target>=state.pages.length)return;
    checkpoint(); [state.pages[state.activeIndex],state.pages[target]]=[state.pages[target],state.pages[state.activeIndex]]; state.activeIndex=target; renderThumbnails(); renderCurrentPage(); updatePageControls();
  }

  async function renderThumbnails() {
    const generation=++state.thumbnailRenderGeneration;
    const list=$('#editorThumbnailList'); if(!list)return; list.innerHTML='';
    for(let index=0;index<state.pages.length;index++){
      if(generation!==state.thumbnailRenderGeneration)return;
      const page=state.pages[index]; const button=document.createElement('button'); button.type='button'; button.className=`editor-thumbnail${index===state.activeIndex?' active':''}`;
      const canvas=document.createElement('canvas'); canvas.width=108; canvas.height=144; const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff';ctx.fillRect(0,0,108,144);
      if(page.kind==='pdf'){
        try{
          const source=state.sources.get(page.sourceId);const renderedPage=await source.rendered.getPage(page.sourceIndex+1);const rotation=getPageRenderRotation(page);const base=renderedPage.getViewport({scale:1,rotation});const scale=Math.min(100/base.width,132/base.height);const viewport=renderedPage.getViewport({scale,rotation});const temp=await renderPdfPageToCanvas(renderedPage,viewport);
          if(generation!==state.thumbnailRenderGeneration)return;
          ctx.drawImage(temp,(108-temp.width)/2,(144-temp.height)/2);temp.width=1;temp.height=1;
        }catch(error){if(!isRenderCancellation(error))drawBlankThumb(ctx,'PDF');}
      }else drawBlankThumb(ctx,'Em branco');
      if(generation!==state.thumbnailRenderGeneration)return;
      button.appendChild(canvas); const span=document.createElement('span');span.textContent=`Página ${index+1} · ${pageOrientation(page)}`;button.appendChild(span);
      if(page.objects.length){const badge=document.createElement('small');badge.textContent=`${page.objects.length} edição(ões)`;button.appendChild(badge);}
      button.addEventListener('click',()=>{state.activeIndex=index;state.selectedObjectId=null;renderThumbnails();renderCurrentPage();updateInspector();});
      list.appendChild(button);
    }
    if(generation===state.thumbnailRenderGeneration)$('#editorPageIndicator').textContent=`${state.pages.length?state.activeIndex+1:0} / ${state.pages.length}`;
  }

  function drawBlankThumb(ctx,label){ctx.strokeStyle='#d7dde6';ctx.strokeRect(8,8,92,128);ctx.fillStyle='#8a95a6';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(label,54,74);}

  function updatePageControls(){
    const has=Boolean(currentPage());
    ['editorDeletePage','editorDuplicatePage','editorMovePageUp','editorMovePageDown','editorRotatePageLeft','editorRotatePageRight','editorAddBlank','editorAddPdf','editorAddImage'].forEach(id=>{const el=$(`#${id}`);if(el)el.disabled=!has;});
    if($('#editorDeletePage'))$('#editorDeletePage').disabled=!has||state.pages.length<=1;
    if($('#editorMovePageUp'))$('#editorMovePageUp').disabled=!has||state.activeIndex===0;
    if($('#editorMovePageDown'))$('#editorMovePageDown').disabled=!has||state.activeIndex===state.pages.length-1;
  }

  function getExportRotation(model, pdfPage) {
    if (model.kind !== 'pdf') return 0;
    const pageRotation = Number(pdfPage?.getRotation?.().angle || 0);
    const sourceRotation = Number.isFinite(Number(model.sourceRotation)) ? Number(model.sourceRotation) : pageRotation;
    return normalizeAngle(sourceRotation + Number(model.rotation || 0));
  }

  function visualPointToPdf(point, rotation, pageWidth, pageHeight) {
    const angle = normalizeAngle(rotation);
    if (angle === 90) return { x: point.y, y: point.x };
    if (angle === 180) return { x: pageWidth - point.x, y: point.y };
    if (angle === 270) return { x: pageWidth - point.y, y: pageHeight - point.x };
    return { x: point.x, y: pageHeight - point.y };
  }

  function visualRectToPdfBox(rect, rotation, pageWidth, pageHeight) {
    const points = [
      visualPointToPdf({ x: rect.x, y: rect.y }, rotation, pageWidth, pageHeight),
      visualPointToPdf({ x: rect.x + rect.width, y: rect.y }, rotation, pageWidth, pageHeight),
      visualPointToPdf({ x: rect.x, y: rect.y + rect.height }, rotation, pageWidth, pageHeight),
      visualPointToPdf({ x: rect.x + rect.width, y: rect.y + rect.height }, rotation, pageWidth, pageHeight)
    ];
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }

  async function exportPdf() {
    if(!state.pages.length)throw new Error('Carregue um PDF no editor.');
    const {PDFDocument,StandardFonts,rgb,degrees}=window.PDFLib;
    const output=await PDFDocument.create();
    const fonts=new Map(); const images=new Map();
    for(let index=0;index<state.pages.length;index++){
      const model=state.pages[index]; let page;
      let source=null; let rasterized=false;
      if(model.kind==='pdf'){
        source=state.sources.get(model.sourceId);
        if(source?.pdfLibDoc){const [copied]=await output.copyPages(source.pdfLibDoc,[model.sourceIndex]);page=copied;output.addPage(page);}
        else{page=await createRasterizedPdfPage(output,source,model);rasterized=true;}
      }else page=output.addPage([model.width,model.height]);
      const exportRotation=rasterized?0:getExportRotation(model,page);
      if(model.kind==='pdf'&&!rasterized)page.setRotation(degrees(exportRotation));
      const pageSize=page.getSize();
      if(model.crop){const cropBox=visualRectToPdfBox(model.crop,exportRotation,pageSize.width,pageSize.height);page.setCropBox(cropBox.x,cropBox.y,cropBox.width,cropBox.height);}
      for(const object of model.objects){
        if(object.type==='text'){
          const key=fontKey(object); if(!fonts.has(key)){const standard=StandardFonts[resolveStandardFont(object)];fonts.set(key,await output.embedFont(standard));}
          const font=fonts.get(key); const color=hexRgb(object.color); const lineHeight=object.fontSize*1.2;
          const maxLines=Math.max(1,Math.floor(object.height/lineHeight)); const lines=wrapText(object.text,font,object.fontSize,object.width).slice(0,maxLines);
          const visualCenter={x:object.x+object.width/2,y:object.y+object.height/2};
          const pdfAngle=normalizeAngle(exportRotation-normalizeAngle(object.rotation||0));
          lines.forEach((line,lineIndex)=>{let visualX=object.x;const width=font.widthOfTextAtSize(line,object.fontSize);if(object.align==='center')visualX=object.x+(object.width-width)/2;if(object.align==='right')visualX=object.x+object.width-width;const visualY=object.y+object.fontSize+lineIndex*lineHeight;const rotatedVisual=rotatePoint({x:visualX,y:visualY},visualCenter,normalizeAngle(object.rotation||0));const point=visualPointToPdf(rotatedVisual,exportRotation,pageSize.width,pageSize.height);page.drawText(line,{x:point.x,y:point.y,size:object.fontSize,font,color:rgb(color.r,color.g,color.b),opacity:object.opacity??1,rotate:degrees(pdfAngle)});});
        }else if(object.type==='image'){
          if(!images.has(object.dataUrl)){const bytes=dataUrlBytes(object.dataUrl);images.set(object.dataUrl,await output.embedPng(bytes));}
          const placement=rotatedPdfPlacement(object,model,page);page.drawImage(images.get(object.dataUrl),{x:placement.x,y:placement.y,width:object.width,height:object.height,rotate:degrees(placement.angle)});
        }else if(object.type==='cover'){
          const color=hexRgb(object.color||'#ffffff');const placement=rotatedPdfPlacement(object,model,page);page.drawRectangle({x:placement.x,y:placement.y,width:object.width,height:object.height,color:rgb(color.r,color.g,color.b),opacity:object.opacity??1,rotate:degrees(placement.angle)});
        }else if(object.type==='path'&&object.points.length>1){
          const color=hexRgb(object.color);for(let p=1;p<object.points.length;p++){const a=visualPointToPdf(object.points[p-1],exportRotation,pageSize.width,pageSize.height),b=visualPointToPdf(object.points[p],exportRotation,pageSize.width,pageSize.height);page.drawLine({start:a,end:b,thickness:object.width,color:rgb(color.r,color.g,color.b),opacity:object.opacity??1});}
        }
      }
      const progress=10+Math.round(((index+1)/state.pages.length)*80);window.dispatchEvent(new CustomEvent('central-editor-progress',{detail:progress}));
    }
    const compatiblePages=state.pages.filter(model=>model.kind==='pdf'&&state.sources.get(model.sourceId)?.compatibilityMode==='raster').length;
    return {bytes:await output.save({useObjectStreams:true}),message:`PDF editado com ${state.pages.length} página(s) e ${state.pages.reduce((sum,p)=>sum+p.objects.length,0)} objeto(s) adicionados.${compatiblePages?` ${compatiblePages} página(s) restrita(s) foram achatadas para preservar a aparência.`:''}`};
  }

  function rotatedPdfPlacement(object,modelOrHeight,pdfPage){
    if(typeof modelOrHeight==='number'){
      const angle=-normalizeAngle(object.rotation||0); const center={x:object.x+object.width/2,y:modelOrHeight-object.y-object.height/2};
      const rotatedHalf=rotateVector({x:object.width/2,y:object.height/2},angle);
      return{x:center.x-rotatedHalf.x,y:center.y-rotatedHalf.y,angle};
    }
    const model=modelOrHeight; const rotation=getExportRotation(model,pdfPage); const size=pdfPage.getSize();
    const visualCenter={x:object.x+object.width/2,y:object.y+object.height/2};
    const center=visualPointToPdf(visualCenter,rotation,size.width,size.height);
    const angle=normalizeAngle(rotation-normalizeAngle(object.rotation||0));
    const rotatedHalf=rotateVector({x:object.width/2,y:object.height/2},angle);
    return{x:center.x-rotatedHalf.x,y:center.y-rotatedHalf.y,angle};
  }

  function wrapText(text,font,size,maxWidth){const lines=[];for(const paragraph of String(text||'').split(/\r?\n/)){const words=paragraph.split(/\s+/);let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth||!line)line=test;else{lines.push(line);line=word;}}lines.push(line);}return lines.length?lines:[''];}
  function fontKey(object){return `${object.fontFamily}-${object.bold?'b':''}-${object.italic?'i':''}`;}
  function resolveStandardFont(object){const family=object.fontFamily||'Helvetica';if(family==='TimesRoman')return object.bold?'TimesRomanBold':'TimesRoman';if(family==='Courier')return object.bold?'CourierBold':'Courier';return object.bold?'HelveticaBold':'Helvetica';}
  function browserFont(font){if(font==='TimesRoman')return 'Georgia, Times New Roman, serif';if(font==='Courier')return 'Courier New, monospace';return 'Arial, Helvetica, sans-serif';}
  function hexRgb(hex){const value=normalizeHex(hex).slice(1);return{r:parseInt(value.slice(0,2),16)/255,g:parseInt(value.slice(2,4),16)/255,b:parseInt(value.slice(4,6),16)/255};}
  function normalizeHex(value){const v=String(value||'#000000');if(/^#[0-9a-f]{6}$/i.test(v))return v;if(/^#[0-9a-f]{3}$/i.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('');return '#000000';}
  function dataUrlBytes(dataUrl){const base64=dataUrl.split(',')[1]||'';const binary=atob(base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
  function imageFileToPngDataUrl(file){return createImageBitmap(file).then(bitmap=>{const max=1800;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/png');});}
  function imageDimensions(dataUrl){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=reject;image.src=dataUrl;});}
  function setEditorStatus(message,type=''){const box=$('#editorStatus');if(!box)return;box.textContent=message;box.className=`editor-status${type?` ${type}`:''}`;}


  function exportProjectState() {
    return {
      pages: deepClone(state.pages),
      activeIndex: state.activeIndex,
      selectedObjectId: state.selectedObjectId,
      zoom: state.zoom,
      sourceSeq: state.sourceSeq,
      objectSeq: state.objectSeq,
      pageSeq: state.pageSeq,
      sources: [...state.sources.values()].map(source => ({ id: source.id, name: source.name, file: source.file }))
    };
  }

  async function restoreProjectState(snapshot, filesById) {
    init();
    reset();
    if (!snapshot) throw new Error('O projeto não contém dados do editor.');
    if (window.CentralPDFEnginesReady) await window.CentralPDFEnginesReady.catch(() => null);
    if (!window.PDFLib || !window.pdfjsLib) throw new Error('Os motores PDF não estão disponíveis para restaurar o editor.');
    await ensureWorker();
    for (const sourceDescriptor of snapshot.sources || []) {
      const file = sourceDescriptor.fileId ? filesById.get(sourceDescriptor.fileId) : null;
      if (!(file instanceof File)) throw new Error(`O arquivo de origem ${sourceDescriptor.name || sourceDescriptor.id} não foi encontrado no projeto.`);
      const source = await loadPdfSource(file, sourceDescriptor.id);
      source.name = sourceDescriptor.name || file.name;
      state.sources.set(sourceDescriptor.id, source);
    }
    state.pages = deepClone(snapshot.pages || []);
    for (const page of state.pages) {
      if (page.kind === 'blank') {
        page.sourceRotation = 0;
        continue;
      }
      if (!Number.isFinite(Number(page.sourceRotation))) {
        const source = state.sources.get(page.sourceId);
        const renderedPage = source ? await source.rendered.getPage(page.sourceIndex + 1) : null;
        page.sourceRotation = normalizeAngle(Number(renderedPage?.rotate || 0));
      }
      page.rotation = normalizeAngle(Number(page.rotation || 0));
    }
    state.activeIndex = clamp(Number(snapshot.activeIndex || 0), 0, Math.max(0, state.pages.length - 1));
    state.selectedObjectId = snapshot.selectedObjectId || null;
    state.zoom = Number(snapshot.zoom || 100);
    state.sourceSeq = Number(snapshot.sourceSeq || state.sources.size);
    state.objectSeq = Number(snapshot.objectSeq || 0);
    state.pageSeq = Number(snapshot.pageSeq || state.pages.length);
    const zoomInput = $('#editorZoom'); if (zoomInput) zoomInput.value = String(state.zoom);
    const zoomLabel = $('#editorZoomValue'); if (zoomLabel) zoomLabel.textContent = `${state.zoom}%`;
    await renderThumbnails();
    await renderCurrentPage();
    updatePageControls();
    updateInspector();
    setEditorStatus(`Projeto restaurado com ${state.pages.length} página(s).`, 'success');
  }

  function getProjectSummary() {
    const objectCount = state.pages.reduce((sum, page) => sum + page.objects.length, 0);
    return {
      pageCount: state.pages.length,
      objectCount,
      signature: `${state.pages.length}:${objectCount}:${state.activeIndex}:${state.pages.map(page => `${page.id}-${page.rotation}-${page.objects.length}`).join('|')}`
    };
  }

  window.PDFVisualEditor = { init, activate, deactivate, reset, loadFile, addPdfPages, exportPdf, exportProjectState, restoreProjectState, getProjectSummary, hasDocument:()=>state.pages.length>0, __test:{ normalizedRect, wrapText, hexRgb, resolveStandardFont, normalizeAngle, rotatePoint, rotateVector, rotatedPdfPlacement, clampObjectInsidePage, getPageRenderRotation, pageOrientation, rotateVisualPoint, rotateVisualRect, rotatePageGeometry, visualPointToPdf, visualRectToPdfBox, getExportRotation, isEncryptedPdfError, isRenderCancellation } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
