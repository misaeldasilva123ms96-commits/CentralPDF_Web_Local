(() => {
  'use strict';

  const nav = document.querySelector('#primaryProductNav');
  const megaMenu = document.querySelector('#allToolsMegaMenu');
  const allToolsButton = document.querySelector('#allToolsMenuButton');
  const allToolsToggle = document.querySelector('#allToolsMenuToggle');
  const mobileButton = document.querySelector('#mobileProductMenuButton');
  const converterButton = document.querySelector('#converterMenuButton');
  const converterMenu = document.querySelector('#converterMenu');
  if (!nav || !megaMenu || !allToolsButton || !allToolsToggle || !mobileButton) return;

  const categoryLabels = {
    organize: 'Organizar',
    edit: 'Editar',
    convert: 'Converter e otimizar',
    security: 'Segurança'
  };

  const sourceCards = [...document.querySelectorAll('.tool-card[data-tool]')];
  const sourceNavigation = document.querySelector('#workspaceToolNav');

  const shortcutPresets = new Map([['Texto e HTML para PDF', {label:'Texto e HTML para PDF', tool:'documentsToPdf', accept:'.html,.htm,.txt,.md,.markdown,.rtf', settings:{docToPdfEngine:'layout'}}]]);

  function openTool(tool, shortcut) {
    const source = sourceCards.find(card => card.dataset.tool === tool && card.dataset.shortcut === shortcut)
      || sourceCards.find(card => card.dataset.tool === tool)
      || sourceNavigation?.querySelector(`[data-tool="${CSS.escape(tool)}"]`);
    source?.click();
    closeMenus();
  }

  function openConversion(item) {
    let selected = false;
    const markSelected = event => { if (event.detail?.tool === item.tool) selected = true; };
    window.addEventListener('centralpdf-tool-selected', markSelected);
    openTool(item.tool, item.sourceLabel || item.label);
    window.removeEventListener('centralpdf-tool-selected', markSelected);
    if (!selected) return;
    applyConversion(item);
  }

  function applyConversion(item) {
    for (const [id, value] of Object.entries(item.settings || {})) {
      const field = document.getElementById(id);
      if (!field) continue;
      field.value = value;
      if (id === 'officeExportFormat') field.dataset.shortcutValue = value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (item.accept) {
      document.querySelector('#fileInput').accept = item.accept;
      document.querySelector('#acceptedTypes').textContent = item.accept.replace(/\./g, '').toUpperCase().split(',').join(' · ');
    }
    document.querySelector('#operationTitle').textContent = item.label;
    const card = sourceCards.find(card => card.dataset.shortcut === item.label);
    const description = item.description || card?.querySelector('p')?.textContent;
    if (description) document.querySelector('#operationDescription').textContent = description;
    document.querySelectorAll('#workspaceToolNav .tool').forEach(button => button.classList.toggle('active', button.dataset.shortcut ? button.dataset.shortcut === item.label : button.dataset.tool === item.tool));
    const format = document.querySelector('#officeExportFormat');
    if (format && item.settings?.officeExportFormat) {
      format.closest('.field').classList.add('hidden');
      if (!format.dataset.shortcutBound) {
        format.dataset.shortcutBound = 'true';
        format.addEventListener('change', () => {
          if (format.value === format.dataset.shortcutValue) return;
          const target = [...shortcutPresets.values()].find(preset => preset.settings?.officeExportFormat === format.value);
          if (target) applyConversion(target);
        });
      }
    }
    const banner = document.querySelector('.conversion-engine-banner strong');
    if (banner) banner.textContent = item.label;
    const shortcut = item.sourceLabel || item.label;
    if (sourceCards.some(card => card.dataset.shortcut === shortcut)) window.dispatchEvent(new CustomEvent('centralpdf-shortcut-selected', {detail:{tool:item.tool,shortcut}}));
    if (['pdfToOffice','documentsToPdf'].includes(item.tool)) {
      document.querySelector('#uxInput').textContent = item.accept ? item.accept.replace(/\./g, '').toUpperCase().split(',').join(' / ') : 'PDF';
      document.querySelector('#uxOutput').textContent = item.settings?.officeExportFormat?.toUpperCase() || 'PDF';
      window.CentralPDFConversions?.updatePlan(item.tool, window.CentralPDFApp?.getFiles() || []);
    }
    window.dispatchEvent(new Event('centralpdf-settings-changed'));
  }

  function cardIcon(tool, shortcut) {
    return sourceCards.find(card => card.dataset.tool === tool && card.dataset.shortcut === shortcut)
      || sourceCards.find(card => card.dataset.tool === tool);
  }

  function buildConverterMenu() {
    if (!converterButton || !converterMenu) return;
    const groups = [
      ['Converter em PDF', [
        { label: 'JPG para PDF', tool: 'imagesToPdf', icon: 'JPG', color: 'image' },
        { label: 'Word para PDF', tool: 'documentsToPdf', icon: 'W', color: 'word', accept: '.docx,.doc,.odt', settings: { docToPdfEngine: 'layout' } },
        { label: 'PowerPoint para PDF', tool: 'documentsToPdf', icon: 'P', color: 'slides', accept: '.pptx,.ppt,.odp', settings: { docToPdfEngine: 'layout' } },
        { label: 'Excel para PDF', tool: 'documentsToPdf', icon: 'X', color: 'sheet', accept: '.xlsx,.xls,.ods,.csv', settings: { docToPdfEngine: 'layout' } },
        { label: 'HTML para PDF', sourceLabel: 'Texto e HTML para PDF', description: 'Converta arquivos HTML em PDF no seu computador.', tool: 'documentsToPdf', icon: 'HTML', color: 'image', accept: '.html,.htm', settings: { docToPdfEngine: 'layout' } }
      ]],
      ['Converter de PDF', [
        { label: 'PDF para JPG', tool: 'pdfToImage', icon: 'JPG', color: 'image', settings: { pdfImageFormat: 'image/jpeg' } },
        { label: 'PDF para Word', tool: 'pdfToOffice', icon: 'W', color: 'word', settings: { officeExportFormat: 'docx', officeDocxMode: 'image' } },
        { label: 'PDF para PowerPoint', tool: 'pdfToOffice', icon: 'P', color: 'slides', settings: { officeExportFormat: 'pptx' } },
        { label: 'PDF para Excel', tool: 'pdfToOffice', icon: 'X', color: 'sheet', settings: { officeExportFormat: 'xlsx' } },
        { label: 'Preparar para arquivamento', tool: 'archivePdf', icon: 'PDF', color: 'pdf' }
      ]]
    ];
    for (const [title, items] of groups) {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = title;
      section.append(heading);
      for (const item of items) {
        shortcutPresets.set(item.label, item);
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.conversion = item.label;
        const icon = document.createElement('span');
        icon.className = `cp2-format-icon ${item.color}`;
        icon.setAttribute('aria-hidden', 'true');
        const source = cardIcon(item.tool, item.sourceLabel || item.label);
        const svg = source?.querySelector('.tool-card-icon svg');
        if (svg) icon.append(svg.cloneNode(true));
        icon.dataset.iconTone = source?.dataset.iconTone || 'violet';
        const label = document.createElement('span');
        label.textContent = item.label;
        button.append(icon, label);
        button.addEventListener('click', () => openConversion(item));
        section.append(button);
      }
      converterMenu.append(section);
    }
    const position = () => {
      if (converterMenu.hidden) return;
      const box = converterButton.getBoundingClientRect();
      const width = Math.min(540, window.innerWidth - 24);
      converterMenu.style.left = `${Math.max(12, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 12))}px`;
      converterMenu.style.top = `${box.bottom + 10}px`;
      converterMenu.style.maxHeight = `${Math.max(120, window.innerHeight - box.bottom - 24)}px`;
    };
    converterButton.addEventListener('click', () => {
      const show = converterMenu.hidden;
      allToolsToggle.checked = false;
      syncMegaMenuState();
      converterMenu.hidden = !show;
      converterButton.setAttribute('aria-expanded', String(show));
      position();
    });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, { passive: true });
    document.addEventListener('click', event => {
      if (converterMenu.contains(event.target) || converterButton.contains(event.target)) return;
      converterMenu.hidden = true;
      converterButton.setAttribute('aria-expanded', 'false');
      if (!nav.contains(event.target) && !mobileButton.contains(event.target)) closeMenus();
    }, true);
    converterButton.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (converterMenu.hidden) converterButton.click();
        converterMenu.querySelector('button')?.focus();
      }
    });
    document.addEventListener('focusin', event => {
      if (converterMenu.hidden || converterMenu.contains(event.target) || converterButton.contains(event.target)) return;
      converterMenu.hidden = true;
      converterButton.setAttribute('aria-expanded', 'false');
    });
  }

  function buildMegaMenu() {
    const grouped = new Map();
    sourceCards.forEach(card => {
      const category = card.dataset.category || 'organize';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push({
        id: card.dataset.tool,
        title: card.querySelector('strong')?.textContent?.trim() || card.dataset.tool,
        description: card.querySelector('p')?.textContent?.trim() || 'Abrir ferramenta',
        source: card
      });
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'cp2-mega-toolbar';
    const summary = document.createElement('strong');
    summary.textContent = `${sourceCards.length} atalhos locais`;
    const close = document.createElement('label');
    close.htmlFor = 'allToolsMenuToggle';
    close.className = 'cp2-mega-close';
    close.setAttribute('role', 'button');
    close.tabIndex = 0;
    close.setAttribute('aria-label', 'Fechar todas as ferramentas');
    close.textContent = 'Fechar ×';
    close.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        allToolsToggle.checked = false;
        syncMegaMenuState();
        allToolsButton.focus();
      }
    });
    toolbar.append(summary, close);

    megaMenu.replaceChildren(toolbar, ...Object.entries(categoryLabels).map(([category, label]) => {
      const section = document.createElement('section');
      section.dataset.categoryGroup = category;
      const heading = document.createElement('h2');
      heading.textContent = label;
      section.append(heading);
      const list = document.createElement('div');
      list.className = 'cp2-mega-list';
      (grouped.get(category) || []).forEach(tool => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.megaTool = tool.id;
        const title = document.createElement('strong');
        title.textContent = tool.title;
        const description = document.createElement('small');
        description.textContent = tool.description;
        const icon = document.createElement('span');
        icon.className = 'tool-menu-icon';
        icon.dataset.iconTone = tool.source.dataset.iconTone || 'violet';
        icon.setAttribute('aria-hidden','true');
        const svg = tool.source.querySelector('.tool-card-icon svg');
        if (svg) icon.append(svg.cloneNode(true));
        const copy = document.createElement('span');
        copy.className = 'cp2-mega-copy';
        copy.append(title, description);
        button.append(icon, copy);
        button.addEventListener('click', () => { tool.source.click(); closeMenus(); });
        list.append(button);
      });
      section.append(list);
      return section;
    }));
  }

  function syncMegaMenuState() {
    allToolsButton.setAttribute('aria-expanded', String(allToolsToggle.checked));
    if (allToolsToggle.checked && converterMenu) {
      converterMenu.hidden = true;
      converterButton?.setAttribute('aria-expanded', 'false');
    }
  }

  function closeMenus() {
    if (converterMenu) converterMenu.hidden = true;
    converterButton?.setAttribute('aria-expanded', 'false');
    allToolsToggle.checked = false;
    syncMegaMenuState();
    document.body.classList.remove('cp2-mobile-nav-open');
    mobileButton.setAttribute('aria-expanded', 'false');
  }

  buildMegaMenu();
  buildConverterMenu();
  window.CentralPDFConversionShortcuts = Object.freeze({apply(label) { const item=shortcutPresets.get(label); if(item && window.CentralPDFApp?.getActiveTool()===item.tool) applyConversion(item); }});
  const expectedToolCount = 34;
  const catalogueStatus = `${sourceCards.length} atalhos`;
  allToolsButton.setAttribute('aria-label', `Todas as ferramentas — ${catalogueStatus}`);
  syncMegaMenuState();
  if (new Set(sourceCards.map(card => card.dataset.tool)).size !== expectedToolCount) {
    console.error(`Catálogo incompleto: esperadas ${expectedToolCount} ferramentas, encontradas ${sourceCards.length}.`);
  }
  document.querySelectorAll('[data-nav-tool]').forEach(button => {
    button.addEventListener('click', () => openTool(button.dataset.navTool));
  });
  allToolsToggle.addEventListener('change', syncMegaMenuState);
  document.addEventListener('click', event => {
    if (!event.target.closest('#allToolsMenuButton')) return;
    event.preventDefault();
    allToolsToggle.checked = !allToolsToggle.checked;
    syncMegaMenuState();
  }, true);
  allToolsButton.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      allToolsToggle.checked = !allToolsToggle.checked;
      syncMegaMenuState();
    }
  });
  mobileButton.addEventListener('click', event => {
    event.stopPropagation();
    const expanded = !document.body.classList.contains('cp2-mobile-nav-open');
    document.body.classList.toggle('cp2-mobile-nav-open', expanded);
    mobileButton.setAttribute('aria-expanded', String(expanded));
    if (!expanded) {
      allToolsToggle.checked = false;
      syncMegaMenuState();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const converterWasOpen = converterMenu && !converterMenu.hidden;
      if (converterWasOpen) {
        converterMenu.hidden = true;
        converterButton.setAttribute('aria-expanded', 'false');
        converterButton.focus();
      } else closeMenus();
    }
  });
  window.addEventListener('centralpdf-tool-selected', event => {
    const activeTool = event.detail?.tool;
    converterButton?.classList.toggle('active', ['pdfToImage', 'imagesToPdf', 'documentsToPdf', 'pdfToOffice', 'archivePdf'].includes(activeTool));
    document.querySelectorAll('[data-nav-tool]').forEach(button => {
      const active = button.dataset.navTool === activeTool;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  });
  document.querySelector('#homeBrand')?.addEventListener('click', () => {
    converterButton?.classList.remove('active');
    document.querySelectorAll('[data-nav-tool]').forEach(button => {
      button.classList.remove('active');
      button.removeAttribute('aria-current');
    });
    closeMenus();
  });
})();
