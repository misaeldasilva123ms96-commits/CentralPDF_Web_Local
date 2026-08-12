(() => {
  'use strict';

  const nav = document.querySelector('#primaryProductNav');
  const megaMenu = document.querySelector('#allToolsMegaMenu');
  const allToolsButton = document.querySelector('#allToolsMenuButton');
  const allToolsToggle = document.querySelector('#allToolsMenuToggle');
  const mobileButton = document.querySelector('#mobileProductMenuButton');
  if (!nav || !megaMenu || !allToolsButton || !allToolsToggle || !mobileButton) return;

  const categoryLabels = {
    organize: 'Organizar',
    edit: 'Editar',
    convert: 'Converter e otimizar',
    security: 'Segurança'
  };

  const sourceCards = [...document.querySelectorAll('.tool-card[data-tool]')];
  const sourceNavigation = document.querySelector('#workspaceToolNav');

  function openTool(tool) {
    const source = sourceCards.find(card => card.dataset.tool === tool)
      || sourceNavigation?.querySelector(`[data-tool="${CSS.escape(tool)}"]`);
    source?.click();
    closeMenus();
  }

  function buildMegaMenu() {
    const grouped = new Map();
    sourceCards.forEach(card => {
      const category = card.dataset.category || 'organize';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push({
        id: card.dataset.tool,
        title: card.querySelector('strong')?.textContent?.trim() || card.dataset.tool,
        description: card.querySelector('p')?.textContent?.trim() || 'Abrir ferramenta'
      });
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'cp2-mega-toolbar';
    const summary = document.createElement('strong');
    summary.textContent = '34 ferramentas locais';
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
        button.append(title, description);
        button.addEventListener('click', () => openTool(tool.id));
        list.append(button);
      });
      section.append(list);
      return section;
    }));
  }

  function syncMegaMenuState() {
    allToolsButton.setAttribute('aria-expanded', String(allToolsToggle.checked));
  }

  function closeMenus() {
    allToolsToggle.checked = false;
    syncMegaMenuState();
    document.body.classList.remove('cp2-mobile-nav-open');
    mobileButton.setAttribute('aria-expanded', 'false');
  }

  buildMegaMenu();
  const expectedToolCount = 34;
  const catalogueStatus = '34 ferramentas';
  allToolsButton.setAttribute('aria-label', `Todas as ferramentas — ${catalogueStatus}`);
  syncMegaMenuState();
  if (sourceCards.length !== expectedToolCount) {
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
    if (event.key === 'Escape') closeMenus();
  });
  window.addEventListener('centralpdf-tool-selected', event => {
    const activeTool = event.detail?.tool;
    document.querySelectorAll('[data-nav-tool]').forEach(button => {
      const active = button.dataset.navTool === activeTool;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  });
  document.querySelector('#homeBrand')?.addEventListener('click', () => {
    document.querySelectorAll('[data-nav-tool]').forEach(button => {
      button.classList.remove('active');
      button.removeAttribute('aria-current');
    });
    closeMenus();
  });
})();
