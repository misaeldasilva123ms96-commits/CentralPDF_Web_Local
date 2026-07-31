(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fileKey = file => file ? `${file.name}-${file.size}-${file.lastModified}` : '';
  const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeName = value => String(value || 'campo').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '') || 'campo';
  const baseName = value => String(value || 'documento').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '_');

  function parsePages(expression, total) {
    const value = String(expression || '').trim().toLowerCase();
    if (!value || value === 'all' || value === 'todas') return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set();
    value.split(',').map(part => part.trim()).filter(Boolean).forEach(part => {
      if (/^\d+$/.test(part)) set.add(Number(part));
      else {
        const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) throw new Error(`Intervalo inválido: ${part}`);
        const start = Number(match[1]), end = Number(match[2]);
        const step = start <= end ? 1 : -1;
        for (let page = start; page !== end + step; page += step) set.add(page);
      }
    });
    const pages = [...set].filter(page => page >= 1 && page <= total).sort((a, b) => a - b);
    if (!pages.length) throw new Error('Nenhuma página válida foi informada.');
    return pages;
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#000000').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(full.slice(0, 2), 16) / 255,
      g: parseInt(full.slice(2, 4), 16) / 255,
      b: parseInt(full.slice(4, 6), 16) / 255,
    };
  }

  function getPoint(event, element) {
    const rect = element.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function normalizedBox(start, end, minW = 0.025, minH = 0.018) {
    const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
    return { x, y, w: Math.max(minW, Math.abs(end.x - start.x)), h: Math.max(minH, Math.abs(end.y - start.y)) };
  }

  function handlesMarkup(includeRotation = false) {
    const names = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    return names.map(name => `<i class="cp18-handle cp18-${name}" data-handle="${name}"></i>`).join('') + (includeRotation ? '<i class="cp18-rotate-stem"></i><button class="cp18-rotate-handle" data-rotate type="button" aria-label="Girar"></button>' : '');
  }

  function applyBox(element, item) {
    element.style.left = `${item.x * 100}%`;
    element.style.top = `${item.y * 100}%`;
    element.style.width = `${item.w * 100}%`;
    element.style.height = `${item.h * 100}%`;
    if ('rotation' in item) element.style.transform = `rotate(${Number(item.rotation || 0)}deg)`;
  }

  function bindTransform({ element, item, overlay, onChange, onSelect, allowRotation = false }) {
    element.addEventListener('pointerdown', event => {
      if (event.target.closest('[data-handle], [data-rotate]')) return;
      event.stopPropagation();
      event.preventDefault();
      onSelect?.();
      const start = getPoint(event, overlay);
      const origin = { x: item.x, y: item.y };
      element.setPointerCapture?.(event.pointerId);
      const move = moveEvent => {
        const point = getPoint(moveEvent, overlay);
        item.x = clamp(origin.x + point.x - start.x, 0, 1 - item.w);
        item.y = clamp(origin.y + point.y - start.y, 0, 1 - item.h);
        applyBox(element, item);
        onChange?.();
      };
      const up = () => {
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', up);
        element.removeEventListener('pointercancel', up);
      };
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', up);
    });

    element.querySelectorAll('[data-handle]').forEach(handle => {
      handle.addEventListener('pointerdown', event => {
        event.stopPropagation();
        event.preventDefault();
        onSelect?.();
        const direction = handle.dataset.handle;
        const start = getPoint(event, overlay);
        const origin = { x: item.x, y: item.y, w: item.w, h: item.h };
        handle.setPointerCapture?.(event.pointerId);
        const move = moveEvent => {
          const point = getPoint(moveEvent, overlay);
          const dx = point.x - start.x, dy = point.y - start.y;
          let x = origin.x, y = origin.y, w = origin.w, h = origin.h;
          if (direction.includes('e')) w = clamp(origin.w + dx, 0.025, 1 - origin.x);
          if (direction.includes('s')) h = clamp(origin.h + dy, 0.018, 1 - origin.y);
          if (direction.includes('w')) { x = clamp(origin.x + dx, 0, origin.x + origin.w - 0.025); w = origin.w + origin.x - x; }
          if (direction.includes('n')) { y = clamp(origin.y + dy, 0, origin.y + origin.h - 0.018); h = origin.h + origin.y - y; }
          item.x = x; item.y = y; item.w = w; item.h = h;
          applyBox(element, item);
          onChange?.();
        };
        const up = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
    });

    if (allowRotation) {
      element.querySelector('[data-rotate]')?.addEventListener('pointerdown', event => {
        event.stopPropagation();
        event.preventDefault();
        onSelect?.();
        const rect = overlay.getBoundingClientRect();
        const center = { x: rect.left + (item.x + item.w / 2) * rect.width, y: rect.top + (item.y + item.h / 2) * rect.height };
        const rotate = moveEvent => {
          let angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x) * 180 / Math.PI + 90;
          if (moveEvent.shiftKey) angle = Math.round(angle / 15) * 15;
          item.rotation = Math.round(angle * 10) / 10;
          applyBox(element, item);
          onChange?.();
        };
        const stop = () => {
          window.removeEventListener('pointermove', rotate);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        };
        window.addEventListener('pointermove', rotate);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
      });
    }
  }

  function createPagedDesigner(kind) {
    const ids = kind === 'form'
      ? { section: 'formBuilderSection', thumbs: 'formBuilderThumbs', base: 'formBuilderBase', overlay: 'formBuilderOverlay', page: 'formBuilderPageLabel', prev: 'formBuilderPrev', next: 'formBuilderNext', hint: 'formBuilderHint' }
      : { section: 'signatureSection', thumbs: 'signatureThumbs', base: 'signatureBase', overlay: 'signatureOverlay', page: 'signaturePageLabel', prev: 'signaturePrev', next: 'signatureNext', hint: 'signatureHint' };
    const state = { file: null, doc: null, page: 1, renderToken: 0, items: [], selectedId: null, placement: null, seq: 0 };
    let renderItems = () => {};

    function ensureUI() {
      if ($(`#${ids.section}`)) return;
      const section = document.createElement('section');
      section.id = ids.section;
      section.className = `cp18-designer cp18-${kind}-designer hidden`;
      section.innerHTML = `
        <div class="cp18-designer-toolbar">
          <button id="${ids.prev}" type="button">←</button>
          <strong id="${ids.page}">0 / 0</strong>
          <button id="${ids.next}" type="button">→</button>
          <span></span>
          <small>${kind === 'form' ? 'Arraste campos, redimensione por qualquer lado e altere as propriedades.' : 'Posicione, redimensione e gire assinaturas visualmente.'}</small>
        </div>
        <div class="cp18-designer-layout">
          <aside><strong>Páginas</strong><div id="${ids.thumbs}"></div></aside>
          <main>
            <div class="cp18-canvas-wrap"><canvas id="${ids.base}"></canvas><div id="${ids.overlay}" class="cp18-overlay"></div></div>
            <p id="${ids.hint}">${kind === 'form' ? 'Escolha um tipo de campo e clique em “Adicionar campo na página”.' : 'Prepare uma assinatura e arraste sobre a página para posicioná-la.'}</p>
          </main>
        </div>`;
      const organizer = $('#organizerSection');
      organizer.parentNode.insertBefore(section, organizer.nextSibling);
    }

    async function load(files) {
      visible(document.body.dataset.activeTool === (kind === 'form' ? 'formBuilder' : 'signPdf'));
      const button = $('#processButton');
      if (!files?.length) { reset(); if (button) button.disabled = true; return; }
      const file = files[0];
      if (state.file && fileKey(state.file) === fileKey(file) && state.doc) return;
      reset(); state.file = file;
      try {
        state.doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        state.page = 1;
        await renderThumbs();
        await renderPage();
        if (button) button.disabled = false;
      } catch (error) {
        const hint = $(`#${ids.hint}`); if (hint) hint.textContent = `Falha ao abrir o PDF: ${error?.message || error}`;
        if (button) button.disabled = true;
      }
    }

    function reset() {
      try { state.doc?.destroy?.(); } catch (_) {}
      state.file = null; state.doc = null; state.page = 1; state.items = []; state.selectedId = null; state.placement = null; state.seq = 0;
      const thumbs = $(`#${ids.thumbs}`); if (thumbs) thumbs.innerHTML = '';
      const base = $(`#${ids.base}`); if (base) { base.width = 1; base.height = 1; }
      const overlay = $(`#${ids.overlay}`); if (overlay) overlay.innerHTML = '';
    }

    function visible(show) { $(`#${ids.section}`)?.classList.toggle('hidden', !show); }

    async function renderThumbs() {
      const host = $(`#${ids.thumbs}`); if (!host || !state.doc) return;
      host.innerHTML = '';
      for (let pageNumber = 1; pageNumber <= state.doc.numPages; pageNumber++) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.page = pageNumber;
        button.innerHTML = `<span>${pageNumber}</span><canvas></canvas>`;
        button.onclick = () => go(pageNumber);
        host.appendChild(button);
        if (pageNumber <= 40 || pageNumber === state.page) {
          const page = await state.doc.getPage(pageNumber), viewport = page.getViewport({ scale: .17 }), canvas = button.querySelector('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
      }
    }

    async function go(pageNumber) {
      if (!state.doc) return;
      state.page = clamp(Number(pageNumber), 1, state.doc.numPages);
      await renderPage();
    }

    async function renderPage() {
      if (!state.doc) return;
      const token = ++state.renderToken;
      const page = await state.doc.getPage(state.page);
      const baseViewport = page.getViewport({ scale: 1 });
      const maxWidth = Math.min(980, Math.max(520, window.innerWidth * .52));
      const scale = Math.min(1.65, maxWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = $(`#${ids.base}`), overlay = $(`#${ids.overlay}`);
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      overlay.style.width = `${canvas.width}px`; overlay.style.height = `${canvas.height}px`;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      if (token !== state.renderToken) return;
      $(`#${ids.page}`).textContent = `${state.page} / ${state.doc.numPages}`;
      document.querySelectorAll(`#${ids.thumbs} button`).forEach(button => button.classList.toggle('active', Number(button.dataset.page) === state.page));
      renderItems();
    }

    function bindNavigation() {
      if ($(`#${ids.section}`)?.dataset.bound) return;
      $(`#${ids.section}`).dataset.bound = '1';
      $(`#${ids.prev}`).onclick = () => go(state.page - 1);
      $(`#${ids.next}`).onclick = () => go(state.page + 1);
    }

    return { ids, state, ensureUI, bindNavigation, load, reset, visible, renderPage, setRenderItems(fn) { renderItems = fn; }, go };
  }

  // FORM BUILDER
  const formDesigner = createPagedDesigner('form');
  const formState = formDesigner.state;

  function formConfigFromInputs(existing = {}) {
    const type = $('#formFieldType')?.value || existing.type || 'text';
    return {
      ...existing,
      type,
      name: safeName($('#formFieldName')?.value || existing.name || `${type}_${formState.seq + 1}`),
      label: String($('#formFieldLabel')?.value || existing.label || '').trim(),
      defaultValue: String($('#formFieldDefault')?.value ?? existing.defaultValue ?? '').trim(),
      options: String($('#formFieldOptions')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
      fontSize: clamp(Number($('#formFieldFontSize')?.value || existing.fontSize || 11), 6, 48),
      maxLength: clamp(Number($('#formFieldMaxLength')?.value || existing.maxLength || 0), 0, 5000),
      textColor: $('#formFieldTextColor')?.value || existing.textColor || '#111827',
      borderColor: $('#formFieldBorderColor')?.value || existing.borderColor || '#7c6cff',
      background: $('#formFieldBackground')?.value || existing.background || '#ffffff',
      required: Boolean($('#formFieldRequired')?.checked),
    };
  }

  function syncFormInputs(field) {
    if (!field) return;
    $('#formFieldType').value = field.type;
    $('#formFieldName').value = field.name;
    $('#formFieldLabel').value = field.label || '';
    $('#formFieldDefault').value = field.defaultValue || '';
    $('#formFieldOptions').value = (field.options || []).join('\n');
    $('#formFieldFontSize').value = field.fontSize || 11;
    $('#formFieldMaxLength').value = field.maxLength || 0;
    $('#formFieldTextColor').value = field.textColor || '#111827';
    $('#formFieldBorderColor').value = field.borderColor || '#7c6cff';
    $('#formFieldBackground').value = field.background || '#ffffff';
    $('#formFieldRequired').checked = Boolean(field.required);
    updateFormOptionsPanel();
  }

  function updateFormOptionsPanel() {
    const type = $('#formFieldType')?.value;
    $('#formFieldOptionsPanel')?.classList.toggle('hidden', !['dropdown', 'radio', 'list'].includes(type));
  }

  function selectedFormField() { return formState.items.find(item => item.id === formState.selectedId) || null; }

  function renderFormItems() {
    const overlay = $(`#${formDesigner.ids.overlay}`); if (!overlay) return;
    overlay.innerHTML = '';
    formState.items.filter(item => item.page === formState.page).forEach(item => {
      const element = document.createElement('div');
      element.className = `cp18-form-field cp18-type-${item.type}${item.id === formState.selectedId ? ' selected' : ''}`;
      element.dataset.id = item.id;
      const preview = item.type === 'checkbox' ? '✓' : item.type === 'radio' ? '○  ○' : item.type === 'dropdown' ? 'Selecionar ▾' : item.type === 'list' ? (item.options || []).slice(0, 3).join(' · ') : item.defaultValue || item.label || item.name;
      element.innerHTML = `<span>${escapeHtml(preview)}</span><small>${escapeHtml(item.name)}${item.required ? ' *' : ''}</small>${handlesMarkup(false)}`;
      applyBox(element, item);
      element.style.setProperty('--field-border', item.borderColor || '#7c6cff');
      element.style.setProperty('--field-bg', `${item.background || '#ffffff'}df`);
      element.style.color = item.textColor || '#111827';
      element.onclick = event => { event.stopPropagation(); formState.selectedId = item.id; syncFormInputs(item); renderFormItems(); updateFormSummary(); };
      bindTransform({ element, item, overlay, onChange: updateFormSummary, onSelect: () => { formState.selectedId = item.id; syncFormInputs(item); renderFormItems(); } });
      overlay.appendChild(element);
    });
    updateFormSummary();
  }
  formDesigner.setRenderItems(renderFormItems);

  function updateFormSummary() {
    const total = formState.items.length, pages = new Set(formState.items.map(item => item.page)).size;
    const summary = $('#formBuilderSummary');
    if (summary) summary.innerHTML = `<strong>${total} campo(s) em ${pages} página(s)</strong><p>${formState.selectedId ? 'Um campo está selecionado. Arraste, redimensione ou altere as propriedades.' : 'Clique em um campo para selecionar ou adicione um novo.'}</p>`;
  }

  function bindFormPlacement() {
    const overlay = $(`#${formDesigner.ids.overlay}`); if (!overlay || overlay.dataset.formBound) return;
    overlay.dataset.formBound = '1';
    let start = null, draft = null;
    overlay.addEventListener('pointerdown', event => {
      if (!formState.placement || event.target !== overlay) { if (event.target === overlay) { formState.selectedId = null; renderFormItems(); } return; }
      event.preventDefault(); start = getPoint(event, overlay);
      draft = document.createElement('div'); draft.className = 'cp18-placement-draft'; overlay.appendChild(draft);
      overlay.setPointerCapture?.(event.pointerId);
    });
    overlay.addEventListener('pointermove', event => {
      if (!start || !draft) return;
      const box = normalizedBox(start, getPoint(event, overlay)); applyBox(draft, box);
    });
    const finish = event => {
      if (!start || !draft) return;
      const box = normalizedBox(start, getPoint(event, overlay)); draft.remove(); draft = null; start = null;
      const config = formConfigFromInputs();
      const item = { id: `f${++formState.seq}`, page: formState.page, ...box, ...config };
      formState.items.push(item); formState.selectedId = item.id; formState.placement = null;
      syncFormInputs(item); renderFormItems();
      $(`#${formDesigner.ids.hint}`).textContent = 'Campo adicionado. Arraste para mover ou use as oito alças para redimensionar.';
    };
    overlay.addEventListener('pointerup', finish); overlay.addEventListener('pointercancel', finish);
  }

  function bindFormControls() {
    updateFormOptionsPanel();
    $('#formFieldType')?.addEventListener('change', updateFormOptionsPanel);
    $('#formStartPlacement')?.addEventListener('click', () => {
      if (!formState.doc) return alert('Adicione um PDF primeiro.');
      formState.placement = formConfigFromInputs();
      $(`#${formDesigner.ids.hint}`).textContent = 'Arraste sobre a página para definir o tamanho do novo campo.';
    });
    $('#formUpdateSelected')?.addEventListener('click', () => {
      const field = selectedFormField(); if (!field) return alert('Selecione um campo.');
      Object.assign(field, formConfigFromInputs(field)); renderFormItems();
    });
    $('#formDuplicateSelected')?.addEventListener('click', () => {
      const field = selectedFormField(); if (!field) return alert('Selecione um campo.');
      const copy = { ...field, id: `f${++formState.seq}`, name: safeName(`${field.name}_copia`), x: clamp(field.x + .025, 0, 1 - field.w), y: clamp(field.y + .025, 0, 1 - field.h) };
      formState.items.push(copy); formState.selectedId = copy.id; syncFormInputs(copy); renderFormItems();
    });
    $('#formDeleteSelected')?.addEventListener('click', () => {
      if (!formState.selectedId) return alert('Selecione um campo.');
      formState.items = formState.items.filter(item => item.id !== formState.selectedId); formState.selectedId = null; renderFormItems();
    });
    $('#formCopySelected')?.addEventListener('click', () => {
      const field = selectedFormField(); if (!field || !formState.doc) return alert('Selecione um campo.');
      let pages; try { pages = parsePages($('#formCopyPages')?.value || 'all', formState.doc.numPages); } catch (error) { return alert(error.message); }
      pages.filter(page => page !== field.page).forEach((page, index) => formState.items.push({ ...field, id: `f${++formState.seq}`, page, name: safeName(`${field.name}_p${page}`), x: field.x, y: field.y }));
      renderFormItems();
    });
  }

  async function processForm({ files, progress, cancelled }) {
    if (files.length !== 1) throw new Error('O designer de formulários trabalha com um PDF por vez.');
    if (!formState.items.length) throw new Error('Adicione ao menos um campo ao documento.');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.load(await files[0].arrayBuffer());
    const form = pdf.getForm();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const usedNames = new Set();
    for (let index = 0; index < formState.items.length; index++) {
      if (cancelled?.()) throw new Error('Operação cancelada pelo usuário.');
      const item = formState.items[index], page = pdf.getPage(item.page - 1), size = page.getSize();
      let name = safeName(item.name || `campo_${index + 1}`), suffix = 2;
      while (usedNames.has(name)) name = `${safeName(item.name)}_${suffix++}`;
      usedNames.add(name);
      const x = item.x * size.width, y = size.height - (item.y + item.h) * size.height, width = item.w * size.width, height = item.h * size.height;
      const textColor = hexToRgb(item.textColor), borderColor = hexToRgb(item.borderColor), background = hexToRgb(item.background);
      const options = { x, y, width, height, borderWidth: 1, textColor: rgb(textColor.r, textColor.g, textColor.b), borderColor: rgb(borderColor.r, borderColor.g, borderColor.b), backgroundColor: rgb(background.r, background.g, background.b), font };
      let field;
      if (item.type === 'checkbox') {
        field = form.createCheckBox(name); field.addToPage(page, options); if (/^(1|true|sim|yes|x)$/i.test(item.defaultValue || '')) field.check();
      } else if (item.type === 'dropdown') {
        field = form.createDropdown(name); const values = item.options?.length ? item.options : ['Opção 1', 'Opção 2']; field.addOptions(values); if (item.defaultValue && values.includes(item.defaultValue)) field.select(item.defaultValue); field.addToPage(page, options);
      } else if (item.type === 'list') {
        field = form.createOptionList(name); const values = item.options?.length ? item.options : ['Opção 1', 'Opção 2']; field.addOptions(values); if (item.defaultValue && values.includes(item.defaultValue)) field.select(item.defaultValue); field.addToPage(page, options);
      } else if (item.type === 'radio') {
        field = form.createRadioGroup(name); const values = item.options?.length ? item.options : ['Opção 1', 'Opção 2']; const each = width / values.length;
        values.forEach((value, optionIndex) => field.addOptionToPage(value, page, { ...options, x: x + optionIndex * each, width: Math.min(height, each * .28), height: Math.min(height, each * .28) }));
        if (item.defaultValue && values.includes(item.defaultValue)) field.select(item.defaultValue);
      } else {
        field = form.createTextField(name);
        if (item.type === 'multiline') field.enableMultiline?.();
        if (item.maxLength > 0) field.setMaxLength?.(item.maxLength);
        field.setFontSize?.(item.fontSize || 11);
        if (item.defaultValue) field.setText(item.defaultValue);
        field.addToPage(page, options);
      }
      if (item.label) field.setAlternateName?.(item.label);
      if (item.required) field.enableRequired?.();
      progress?.(Math.round(((index + 1) / formState.items.length) * 90));
      await waitFrame();
    }
    try { form.updateFieldAppearances(font); } catch (_) {}
    pdf.setProducer('Central PDF & Imagem 1.0 - Formulários');
    const bytes = await pdf.save({ useObjectStreams: true });
    const filename = `${baseName(files[0].name)}_formulario_preenchivel.pdf`;
    return { outputs: [{ filename, blob: new Blob([bytes], { type: 'application/pdf' }) }], message: `${formState.items.length} campo(s) preenchível(is) criado(s) em ${new Set(formState.items.map(item => item.page)).size} página(s).` };
  }

  function mountForms() {
    formDesigner.ensureUI(); formDesigner.bindNavigation(); bindFormPlacement(); bindFormControls(); updateFormSummary();
  }

  // SIGNATURES
  const signatureDesigner = createPagedDesigner('signature');
  const signatureState = signatureDesigner.state;
  let signatureAsset = null;
  const padState = { drawing: false, last: null };

  function renderSignatureItems() {
    const overlay = $(`#${signatureDesigner.ids.overlay}`); if (!overlay) return;
    overlay.innerHTML = '';
    signatureState.items.filter(item => item.page === signatureState.page).forEach(item => {
      const element = document.createElement('div');
      element.className = `cp18-signature-item${item.id === signatureState.selectedId ? ' selected' : ''}`;
      element.dataset.id = item.id;
      element.innerHTML = `<img src="${item.dataUrl}" alt="Assinatura"><span>${escapeHtml([item.signerName, item.date].filter(Boolean).join(' • '))}</span>${handlesMarkup(true)}`;
      applyBox(element, item);
      element.onclick = event => { event.stopPropagation(); signatureState.selectedId = item.id; $('#signatureRotation').value = item.rotation || 0; renderSignatureItems(); updateSignatureSummary(); };
      bindTransform({ element, item, overlay, allowRotation: true, onChange: () => { $('#signatureRotation').value = item.rotation || 0; updateSignatureSummary(); }, onSelect: () => { signatureState.selectedId = item.id; $('#signatureRotation').value = item.rotation || 0; renderSignatureItems(); } });
      overlay.appendChild(element);
    });
    updateSignatureSummary();
  }
  signatureDesigner.setRenderItems(renderSignatureItems);

  function selectedSignature() { return signatureState.items.find(item => item.id === signatureState.selectedId) || null; }
  function signatureDate() {
    const mode = $('#signatureDateMode')?.value || 'none';
    if (mode === 'today') return new Date().toLocaleDateString('pt-BR');
    if (mode === 'custom') { const raw = $('#signatureCustomDate')?.value; if (!raw) return ''; const [y, m, d] = raw.split('-'); return `${d}/${m}/${y}`; }
    return '';
  }

  function updateSignaturePanels() {
    const source = $('#signatureSource')?.value || 'draw';
    $('#signatureDrawPanel')?.classList.toggle('hidden', source !== 'draw');
    $('#signatureTypedPanel')?.classList.toggle('hidden', source !== 'typed');
    $('#signatureImagePanel')?.classList.toggle('hidden', source !== 'image');
    $('#signatureCustomDatePanel')?.classList.toggle('hidden', $('#signatureDateMode')?.value !== 'custom');
    $('#signatureSelectedPagesPanel')?.classList.toggle('hidden', $('#signaturePageScope')?.value !== 'selected');
  }

  function bindSignaturePad() {
    const canvas = $('#signaturePad'); if (!canvas || canvas.dataset.bound) return; canvas.dataset.bound = '1';
    const ctx = canvas.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    canvas.addEventListener('pointerdown', event => { event.preventDefault(); padState.drawing = true; padState.last = point(event); canvas.setPointerCapture?.(event.pointerId); });
    canvas.addEventListener('pointermove', event => { if (!padState.drawing) return; const next = point(event); ctx.strokeStyle = $('#signatureInkColor')?.value || '#111827'; ctx.lineWidth = Number($('#signatureInkWidth')?.value || 3); ctx.beginPath(); ctx.moveTo(padState.last.x, padState.last.y); ctx.lineTo(next.x, next.y); ctx.stroke(); padState.last = next; });
    const stop = () => { padState.drawing = false; padState.last = null; };
    canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
    $('#signaturePadClear').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function canvasTrimmedDataUrl(canvas) {
    const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 10) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (maxX < minX) throw new Error('Desenhe uma assinatura antes de continuar.');
    const out = document.createElement('canvas'); out.width = maxX - minX + 12; out.height = maxY - minY + 12; out.getContext('2d').drawImage(canvas, minX, minY, maxX - minX + 1, maxY - minY + 1, 6, 6, maxX - minX + 1, maxY - minY + 1); return out.toDataURL('image/png');
  }

  function typedSignatureDataUrl() {
    const text = ($('#signatureTypedText')?.value || '').trim(); if (!text) throw new Error('Digite o nome da assinatura.');
    const style = $('#signatureTypedFont')?.value || 'serif', family = style === 'cursive' ? '"Segoe Script", cursive' : style === 'sans' ? 'Arial, sans-serif' : 'Georgia, serif';
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 220; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = $('#signatureTypedColor')?.value || '#111827'; ctx.font = `italic 96px ${family}`; ctx.textBaseline = 'middle'; ctx.fillText(text, 30, 110); return canvasTrimmedDataUrl(canvas);
  }

  async function imageSignatureDataUrl() {
    const file = $('#signatureImageInput')?.files?.[0]; if (!file) throw new Error('Selecione uma imagem da assinatura.');
    const bitmap = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
    if ($('#signatureRemoveWhite')?.checked) {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height), data = image.data;
      for (let i = 0; i < data.length; i += 4) { const light = Math.min(data[i], data[i + 1], data[i + 2]); if (light > 225) data[i + 3] = Math.round((255 - light) * 5); }
      ctx.putImageData(image, 0, 0);
    }
    return canvas.toDataURL('image/png');
  }

  async function prepareSignatureAsset() {
    const source = $('#signatureSource')?.value || 'draw';
    if (source === 'draw') signatureAsset = canvasTrimmedDataUrl($('#signaturePad'));
    else if (source === 'typed') signatureAsset = typedSignatureDataUrl();
    else signatureAsset = await imageSignatureDataUrl();
    signatureState.placement = true;
    $(`#${signatureDesigner.ids.hint}`).textContent = 'Assinatura preparada. Arraste sobre a página para posicionar e dimensionar.';
  }

  function bindSignaturePlacement() {
    const overlay = $(`#${signatureDesigner.ids.overlay}`); if (!overlay || overlay.dataset.signatureBound) return; overlay.dataset.signatureBound = '1';
    let start = null, draft = null;
    overlay.addEventListener('pointerdown', event => {
      if (!signatureState.placement || !signatureAsset || event.target !== overlay) { if (event.target === overlay) { signatureState.selectedId = null; renderSignatureItems(); } return; }
      event.preventDefault(); start = getPoint(event, overlay); draft = document.createElement('div'); draft.className = 'cp18-placement-draft signature'; overlay.appendChild(draft); overlay.setPointerCapture?.(event.pointerId);
    });
    overlay.addEventListener('pointermove', event => { if (start && draft) applyBox(draft, normalizedBox(start, getPoint(event, overlay), .06, .025)); });
    const finish = event => {
      if (!start || !draft) return;
      const box = normalizedBox(start, getPoint(event, overlay), .06, .025); draft.remove(); draft = null; start = null;
      const scope = $('#signaturePageScope')?.value || 'manual'; let pages = [signatureState.page];
      if (scope === 'all') pages = Array.from({ length: signatureState.doc.numPages }, (_, index) => index + 1);
      else if (scope === 'selected') { try { pages = parsePages($('#signatureSelectedPages')?.value, signatureState.doc.numPages); } catch (error) { alert(error.message); return; } }
      const signerName = ($('#signatureSignerName')?.value || '').trim(), date = signatureDate(), rotation = Number($('#signatureRotation')?.value || 0);
      pages.forEach((page, index) => signatureState.items.push({ id: `s${++signatureState.seq}`, page, ...box, dataUrl: signatureAsset, signerName, date, rotation }));
      signatureState.selectedId = signatureState.items.at(-1)?.id || null; signatureState.placement = null; renderSignatureItems();
      $(`#${signatureDesigner.ids.hint}`).textContent = `${pages.length} assinatura(s) posicionada(s). Use as alças para ajustar tamanho e rotação.`;
    };
    overlay.addEventListener('pointerup', finish); overlay.addEventListener('pointercancel', finish);
  }

  function updateSignatureSummary() {
    const total = signatureState.items.length, pages = new Set(signatureState.items.map(item => item.page)).size;
    const summary = $('#signatureSummary'); if (summary) summary.innerHTML = `<strong>${total} assinatura(s) em ${pages} página(s)</strong><p>${signatureState.selectedId ? 'A assinatura selecionada pode ser movida, redimensionada e girada.' : 'Prepare uma assinatura e posicione-a no documento.'}</p>`;
  }

  function bindSignatureControls() {
    $('#signatureSource')?.addEventListener('change', updateSignaturePanels);
    $('#signatureDateMode')?.addEventListener('change', updateSignaturePanels);
    $('#signaturePageScope')?.addEventListener('change', updateSignaturePanels);
    $('#signaturePrepare')?.addEventListener('click', async () => { try { await prepareSignatureAsset(); } catch (error) { alert(error.message); } });
    $('#signatureRotation')?.addEventListener('input', () => { const item = selectedSignature(); if (!item) return; item.rotation = clamp(Number($('#signatureRotation').value || 0), -180, 180); renderSignatureItems(); });
    $('#signatureDuplicate')?.addEventListener('click', () => { const item = selectedSignature(); if (!item) return alert('Selecione uma assinatura.'); const copy = { ...item, id: `s${++signatureState.seq}`, x: clamp(item.x + .025, 0, 1 - item.w), y: clamp(item.y + .025, 0, 1 - item.h) }; signatureState.items.push(copy); signatureState.selectedId = copy.id; renderSignatureItems(); });
    $('#signatureDelete')?.addEventListener('click', () => { if (!signatureState.selectedId) return alert('Selecione uma assinatura.'); signatureState.items = signatureState.items.filter(item => item.id !== signatureState.selectedId); signatureState.selectedId = null; renderSignatureItems(); });
    $('#signatureRubricAll')?.addEventListener('click', () => {
      const item = selectedSignature(); if (!item || !signatureState.doc) return alert('Selecione uma assinatura para usar como rubrica.');
      for (let page = 1; page <= signatureState.doc.numPages; page++) if (!signatureState.items.some(candidate => candidate.page === page && candidate.rubric)) signatureState.items.push({ ...item, id: `s${++signatureState.seq}`, page, rubric: true, x: .82, y: .88, w: Math.min(.14, item.w * .55), h: Math.min(.06, item.h * .55), signerName: '', date: '' });
      renderSignatureItems();
    });
    updateSignaturePanels(); bindSignaturePad();
  }

  async function processSignatures({ files, progress, cancelled }) {
    if (files.length !== 1) throw new Error('A assinatura visual trabalha com um PDF por vez.');
    if (!signatureState.items.length) throw new Error('Posicione ao menos uma assinatura no documento.');
    const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;
    const pdf = await PDFDocument.load(await files[0].arrayBuffer());
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const cache = new Map();
    for (let index = 0; index < signatureState.items.length; index++) {
      if (cancelled?.()) throw new Error('Operação cancelada pelo usuário.');
      const item = signatureState.items[index], page = pdf.getPage(item.page - 1), size = page.getSize();
      let image = cache.get(item.dataUrl);
      if (!image) { const bytes = Uint8Array.from(atob(item.dataUrl.split(',')[1]), char => char.charCodeAt(0)); image = await pdf.embedPng(bytes); cache.set(item.dataUrl, image); }
      const x = item.x * size.width, y = size.height - (item.y + item.h) * size.height, width = item.w * size.width, height = item.h * size.height;
      page.drawImage(image, { x, y, width, height, rotate: degrees(Number(item.rotation || 0)) });
      const caption = [item.signerName, item.date].filter(Boolean).join(' • ');
      if (caption) page.drawText(caption, { x, y: Math.max(4, y - 11), size: 8, font, color: rgb(.18, .22, .3), maxWidth: Math.max(40, width) });
      progress?.(Math.round(((index + 1) / signatureState.items.length) * 90)); await waitFrame();
    }
    pdf.setProducer('Central PDF & Imagem 1.0 - Assinatura visual');
    const bytes = await pdf.save({ useObjectStreams: true });
    return { outputs: [{ filename: `${baseName(files[0].name)}_assinado_visual.pdf`, blob: new Blob([bytes], { type: 'application/pdf' }) }], message: `${signatureState.items.length} assinatura(s) ou rubrica(s) aplicadas em ${new Set(signatureState.items.map(item => item.page)).size} página(s).` };
  }

  function mountSignatures() { signatureDesigner.ensureUI(); signatureDesigner.bindNavigation(); bindSignaturePlacement(); bindSignatureControls(); updateSignatureSummary(); }

  window.CentralPDFForms = {
    mount: mountForms,
    updatePlan: files => { mountForms(); return formDesigner.load(files); },
    process: processForm,
    visible: formDesigner.visible,
    exportProjectState: () => ({ fields: formState.items.map(item => ({ ...item })), page: formState.page, seq: formState.seq }),
    restoreProjectState: async data => { formState.items = (data?.fields || []).map(item => ({ ...item })); formState.seq = Number(data?.seq || formState.items.length); formState.page = Number(data?.page || 1); formState.selectedId = null; await formDesigner.go(formState.page); renderFormItems(); },
    getFields: () => formState.items.map(item => ({ ...item }))
  };
  window.CentralPDFSignatures = {
    mount: mountSignatures,
    updatePlan: files => { mountSignatures(); return signatureDesigner.load(files); },
    process: processSignatures,
    visible: signatureDesigner.visible,
    exportProjectState: () => ({ items: signatureState.items.map(item => ({ ...item })), page: signatureState.page, seq: signatureState.seq }),
    restoreProjectState: async data => { signatureState.items = (data?.items || []).map(item => ({ ...item })); signatureState.seq = Number(data?.seq || signatureState.items.length); signatureState.page = Number(data?.page || 1); signatureState.selectedId = null; await signatureDesigner.go(signatureState.page); renderSignatureItems(); },
    getItems: () => signatureState.items.map(item => ({ ...item }))
  };
})();
