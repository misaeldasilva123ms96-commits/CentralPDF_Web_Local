/* Global file entry points. Document bytes stay in the existing local pipeline. */
(() => {
  'use strict';
  const app = window.CentralPDFApp;
  if (!app) return;
  const $ = selector => document.querySelector(selector);
  let pending = [];
  const banner = document.createElement('div');
  banner.id = 'globalDropHint';
  banner.className = 'global-drop-hint';
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  banner.textContent = 'Solte os arquivos para escolher uma ferramenta';
  document.body.append(banner);
  const dialog = document.createElement('dialog');
  dialog.id = 'globalImportDialog';
  dialog.setAttribute('aria-labelledby', 'globalImportTitle');
  dialog.innerHTML = '<div class="import-heading"><h2 id="globalImportTitle">O que deseja fazer com os arquivos?</h2><button type="button" id="globalImportClose" class="small-button" aria-label="Cancelar importação">Fechar</button></div><p id="globalImportSummary" role="status"></p><div id="globalImportTools" class="import-tool-list"></div><p class="help-text">Os documentos são processados somente neste navegador. Escolha uma ferramenta para continuar.</p>';
  document.body.append(dialog);
  $('#globalImportClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { pending = []; });
  const accepts = (file, accept) => accept.split(',').some(value => {
    const type = value.trim().toLowerCase();
    if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type);
    if (type.endsWith('/*')) return file.type.toLowerCase().startsWith(type.slice(0, -1));
    return file.type.toLowerCase() === type;
  });
  function chooseTool(files) {
    pending = files;
    const tools = $('#globalImportTools');
    tools.replaceChildren();
    $('#globalImportSummary').textContent = `${files.length} arquivo(s): ${files.map(file => file.name).join(', ')}`;
    for (const tool of Object.values(app.getToolCatalog())) {
      if (!files.every(file => accepts(file, tool.accept))) continue;
      if (files.length > 1 && !tool.multiple && !['editPdf', 'organize'].includes(tool.key)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'import-tool-button';
      button.dataset.importTool = tool.key;
      const title = document.createElement('strong'); title.textContent = tool.title;
      const description = document.createElement('span'); description.textContent = tool.description;
      button.append(title, description);
      button.addEventListener('click', async () => {
        const incoming = pending;
        dialog.close();
        await app.openFilesInTool(incoming, tool.key);
      });
      tools.append(button);
    }
    if (!tools.childElementCount) $('#globalImportSummary').textContent += '. Nenhuma ferramenta aceita esta combinação. Separe PDFs e imagens ou escolha arquivos compatíveis.';
    if (!dialog.open) dialog.showModal();
  }
  const isFileDrag = event => Array.from(event.dataTransfer?.types || []).includes('Files') || Boolean(event.dataTransfer?.files?.length);
  const homeVisible = () => !$('#homeView').classList.contains('hidden');
  const blocked = () => Boolean(document.querySelector('dialog[open]')) || document.body.classList.contains('foundation-processing') || document.body.classList.contains('completion-open');
  // Capture prevents accidental navigation even over the header or a modal.
  document.addEventListener('dragover', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (blocked()) { event.dataTransfer.dropEffect = 'none'; return; }
    event.dataTransfer.dropEffect = 'copy';
    if (homeVisible()) banner.hidden = false;
  }, true);
  document.addEventListener('dragleave', event => {
    if (!event.relatedTarget) banner.hidden = true;
  });
  document.addEventListener('drop', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    banner.hidden = true;
    if (blocked()) { event.stopPropagation(); return; }
    if (homeVisible()) {
      event.stopPropagation();
      chooseTool(Array.from(event.dataTransfer.files));
    } else if (!$('#toolWorkspace').contains(event.target)) {
      event.stopPropagation();
      app.addFiles(Array.from(event.dataTransfer.files), { source: 'global-drop' });
    }
  }, true);
  window.addEventListener('blur', () => { banner.hidden = true; });
  document.addEventListener('dragend', () => { banner.hidden = true; });
  $('#homeImportButton')?.addEventListener('click', () => $('#homeImportInput').click());
  $('#homeImportInput')?.addEventListener('change', event => {
    if (event.target.files.length) chooseTool(Array.from(event.target.files));
    event.target.value = '';
  });
})();
