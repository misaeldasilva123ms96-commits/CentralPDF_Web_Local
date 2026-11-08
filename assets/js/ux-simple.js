/* Presentation adapters only. Existing fields remain the single source of truth. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const app = window.CentralPDFApp;
  if (!app) return;

  function disclosure(id, title) {
    const node = document.createElement('details');
    node.id = id; node.className = 'ux-advanced';
    const summary = document.createElement('summary'); summary.textContent = title;
    const body = document.createElement('div'); body.className = 'ux-advanced-body';
    node.append(summary, body);
    return node;
  }

  function choices(field, title, values) {
    const group = document.createElement('fieldset'); group.className = 'ux-choices';
    const legend = document.createElement('legend'); legend.textContent = title; group.append(legend);
    for (const [value, label] of values) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.setting = field.id; button.dataset.value = value;
      button.textContent = label;
      button.addEventListener('click', () => {
        field.value = value; field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
      group.append(button);
    }
    const sync = () => group.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(field.value === button.dataset.value)));
    field.addEventListener('change', sync); field.addEventListener('input', sync); sync();
    return group;
  }

  function mountImages() {
    const container = $('#settingsContent');
    if (!$('#imageOrientation') || $('#imageMergeAll')) return;
    const advanced = disclosure('imageAdvanced', 'Mais opções de imagem');
    const body = advanced.lastElementChild;
    const orientation = $('#imageOrientation'), margin = $('#imageMargin'), output = $('#imageOutputMode');
    const orientationChoices = choices(orientation, 'Orientação da página', [['portrait','Retrato'],['landscape','Paisagem'],['auto','Automática']]);
    const marginChoices = choices(margin, 'Margens', [['0','Sem margem'],['10','Pequena'],['20','Grande']]);
    const custom = document.createElement('button'); custom.type = 'button'; custom.textContent = 'Personalizada';
    custom.addEventListener('click', () => { advanced.open = true; margin.focus(); });
    marginChoices.append(custom);
    const syncCustom = () => custom.setAttribute('aria-pressed',String(!['0','10','20'].includes(margin.value)));
    margin.addEventListener('input',syncCustom); margin.addEventListener('change',syncCustom); syncCustom();
    // Move existing controls with their listeners; do not replace their IDs/values.
    for (const id of ['imageOutputMode','imageOrientation','imageMargin','imageFit','imageAlign','imageBackground','imageNoUpscale']) {
      const field = $('#'+id), node = field.closest('.field, .toggle-row');
      if (node) body.append(node);
    }
    // The empty legacy field-row has no state or behavior.
    container.querySelectorAll('.field-row').forEach(row => { if (!row.childElementCount) row.remove(); });
    container.prepend(orientationChoices);
    $('#imageCustomPagePanel').after(marginChoices);
    const combine = document.createElement('label'); combine.className = 'toggle-row ux-combine';
    const checkbox = document.createElement('input'); checkbox.id = 'imageMergeAll'; checkbox.type = 'checkbox';
    const label = document.createElement('span'); label.textContent = 'Mesclar todas as imagens em um único PDF';
    checkbox.checked = output.value === 'combined';
    checkbox.addEventListener('change', () => { output.value = checkbox.checked ? 'combined' : 'separate'; output.dispatchEvent(new Event('change',{bubbles:true})); });
    output.addEventListener('change', () => { checkbox.checked = output.value === 'combined'; });
    combine.append(checkbox,label); marginChoices.after(combine);
    const summary = document.createElement('p'); summary.id = 'imageOutputSummary'; summary.className = 'ux-output-summary'; summary.setAttribute('role','status');
    combine.after(summary);
    const note = document.createElement('p'); note.className = 'help-text'; note.textContent = 'Prévia aproximada do papel e das margens. Confira o PDF gerado antes de compartilhar.';
    $('#fileSection').append(note); note.dataset.imagePreviewNote = 'true';
    $('#processButton').textContent = 'Converter em PDF';
    $('#outputFileName').closest('.field').before(advanced);
    updateImages();
  }

  function updateImages() {
    if (app.getActiveTool() !== 'imagesToPdf' || !$('#imageOutputSummary')) return;
    const count = app.getFiles().length, combined = $('#imageOutputMode').value === 'combined';
    $('#imageOutputSummary').textContent = !count ? 'Adicione JPG, PNG ou WEBP para converter.' : `${count} ${count === 1 ? 'imagem' : 'imagens'} → ${combined ? `1 PDF com ${count} ${count === 1 ? 'página' : 'páginas'}` : count === 1 ? '1 PDF individual' : `${count} PDFs individuais em um ZIP`}`;
    const mm = v => Number(v || 0) * 72 / 25.4;
    const margin = Math.max(0,mm($('#imageMargin').value));
    for (const cover of document.querySelectorAll('#fileList .file-card-cover')) {
      const image = cover.querySelector('img');
      if (!image || !image.complete || !image.naturalWidth) continue;
      let paper = cover.querySelector('.ux-image-paper');
      if (!paper) { paper=document.createElement('span');paper.className='ux-image-paper';cover.prepend(paper);paper.append(image); }
      const iw = Number(image.dataset.sourceWidth || image.naturalWidth), ih = Number(image.dataset.sourceHeight || image.naturalHeight);
      const mode = $('#imagePageMode').value, orientation = $('#imageOrientation').value;
      let w = mode === 'image' ? iw+2*margin : mode === 'letter' ? 612 : mode === 'custom' ? mm($('#imageCustomWidth').value || 210) : 595.28;
      let h = mode === 'image' ? ih+2*margin : mode === 'letter' ? 792 : mode === 'custom' ? mm($('#imageCustomHeight').value || 297) : 841.89;
      if ((orientation === 'landscape' || (orientation === 'auto' && iw>ih && mode!=='image')) && h>w) [w,h]=[h,w];
      if (orientation === 'portrait' && w>h) [w,h]=[h,w];
      const bw=Math.max(1,w-2*margin),bh=Math.max(1,h-2*margin),fit=$('#imageFit').value;
      let scale=fit==='cover'?Math.max(bw/iw,bh/ih):Math.min(bw/iw,bh/ih);
      if ($('#imageNoUpscale').checked) scale=Math.min(1,scale);
      const dw=fit==='stretch'?bw:iw*scale,dh=fit==='stretch'?bh:ih*scale;
      const alignment=$('#imageAlign').value;
      const top=alignment==='top'?margin:alignment==='bottom'?h-margin-dh:(h-dh)/2;
      paper.style.aspectRatio=`${w} / ${h}`;
      // Fit the complete paper inside the available cover, including the
      // existing thumbnail-size preference and compact mobile padding.
      paper.style.maxWidth=`min(100%, calc(var(--ux-paper-space, 310px) * ${w/h}))`;
      paper.style.background=$('#imageBackground').value;
      paper.dataset.width=String(w);paper.dataset.height=String(h);
      Object.assign(image.style,{left:`${100*(w-dw)/2/w}%`,top:`${100*top/h}%`,width:`${100*dw/w}%`,height:`${100*dh/h}%`});
    }
  }

  function syncWorkingState() {
    document.body.dataset.uxHasFiles=String(app.getFiles().length>0);
  }

  // Keep the original action and its handlers. Reserve its measured height so
  // the last fields can scroll fully above it, including the virtual keyboard.
  const actionDock=$('.action-dock');
  let focusFrame=0;
  function keepFocusedControlVisible() {
    const field=document.activeElement;
    if(!window.matchMedia('(max-width:980px)').matches||!field?.matches('select,textarea,input:not([type="checkbox"]):not([type="range"]):not([type="file"])')||!field.closest('.settings-panel'))return;
    cancelAnimationFrame(focusFrame);
    focusFrame=requestAnimationFrame(()=>{
      const rect=field.getBoundingClientRect(),dock=actionDock?.getBoundingClientRect();
      const top=(window.visualViewport?.offsetTop||0)+12;
      if(dock&&rect.bottom>dock.top-12)window.scrollBy({top:rect.bottom-dock.top+12,behavior:'instant'});
      else if(rect.top<top)window.scrollBy({top:rect.top-top,behavior:'instant'});
    });
  }
  function syncActionViewport() {
    const viewport=window.visualViewport;
    const bottom=Math.max(0,window.innerHeight-(viewport?.height||window.innerHeight)-(viewport?.offsetTop||0));
    document.body.style.setProperty('--ux-keyboard-offset',`${bottom}px`);
    document.body.style.setProperty('--ux-viewport-left',`${viewport?.offsetLeft||0}px`);
    document.body.style.setProperty('--ux-viewport-width',`${viewport?.width||window.innerWidth}px`);
    document.body.style.setProperty('--ux-viewport-height',`${viewport?.height||window.innerHeight}px`);
    document.body.dataset.uxShortViewport=String((viewport?.height||window.innerHeight)<480);
    document.body.style.setProperty('--ux-action-height',`${actionDock?.getBoundingClientRect().height||0}px`);
    keepFocusedControlVisible();
  }
  if(actionDock&&window.ResizeObserver)new ResizeObserver(syncActionViewport).observe(actionDock);
  window.addEventListener('resize',syncActionViewport);
  window.visualViewport?.addEventListener('resize',syncActionViewport);
  window.visualViewport?.addEventListener('scroll',syncActionViewport);
  document.addEventListener('focusin',keepFocusedControlVisible);

  // Secondary task metadata stays accessible with the existing contextual guide.
  const strip = $('.tool-experience-strip'), guide = $('.tool-guide-body');
  if (strip && guide) guide.prepend(strip);

  window.addEventListener('centralpdf-tool-selected', event => {
    document.querySelectorAll('[data-image-preview-note]').forEach(node => node.remove());
    if (event.detail.tool === 'imagesToPdf') mountImages();
    syncWorkingState();syncActionViewport();
  });
  window.addEventListener('centralpdf-files-changed',syncWorkingState);
  window.addEventListener('centralpdf-files-changed', updateImages);
  $('#fileList')?.addEventListener('centralpdf-preview-ready', updateImages);
  $('#fileList')?.addEventListener('load', updateImages, true);
  $('#settingsContent')?.addEventListener('input', updateImages);
  $('#settingsContent')?.addEventListener('change', updateImages);
  syncWorkingState();syncActionViewport();
})();
