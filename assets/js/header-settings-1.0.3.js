(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const THEME_KEY = 'centralpdf_theme_preference';
  const buttonIds = [
    'foundationProjectsButton',
    'foundationQueueButton',
    'foundationDiagnosticsButton',
    'cp15ResultsBtn',
    'cp15FlowsBtn',
    'cp15PresetsBtn',
    'cp10QualityButton'
  ];

  let mounted = false;

  function getStoredTheme() {
    try {const stored=window.localStorage.getItem(THEME_KEY);return stored==='dark'?'dark':'light';}
    catch (_) {return document.body.dataset.theme==='dark'?'dark':'light';}
  }

  function applyTheme(mode) {
    const theme = mode === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {window.localStorage.setItem(THEME_KEY, theme);}catch (_) {}
    syncThemeButtons(theme);
  }

  function syncThemeButtons(theme = getStoredTheme()) {
    const toggle=$('#cp101ThemeToggle');
    if(toggle){toggle.setAttribute('aria-checked',String(theme==='dark'));toggle.title=theme==='dark'?'Ativar tema claro':'Ativar tema escuro';}
  }

  function allButtonsReady() {
    return buttonIds.every(id => document.getElementById(id));
  }

  function closeMenu(restoreFocus = false) {
    const panel = $('#cp101SettingsPanel');
    const trigger = $('#cp101SettingsButton');
    const backdrop = $('#cp101SettingsBackdrop');
    if (!panel || !trigger) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    backdrop?.setAttribute('hidden', 'hidden');
    if(restoreFocus)trigger.focus();
  }

  function openMenu() {
    const panel = $('#cp101SettingsPanel');
    const trigger = $('#cp101SettingsButton');
    const backdrop = $('#cp101SettingsBackdrop');
    if (!panel || !trigger) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    backdrop?.removeAttribute('hidden');
    $('#cp101ThemeToggle')?.focus();
  }

  function toggleMenu() {
    const panel = $('#cp101SettingsPanel');
    if (!panel) return;
    if (panel.hidden) openMenu();
    else closeMenu();
  }

  function group(title, ids, extraClass = '') {
    const section = document.createElement('section');
    section.className = `cp101-settings-section ${extraClass}`.trim();
    section.innerHTML = `<div class="cp101-settings-section-title">${title}</div><div class="cp101-settings-list"></div>`;
    const list = $('.cp101-settings-list', section);
    ids.forEach(id => {
      const button = document.getElementById(id);
      if (button) list.appendChild(button);
    });
    return section;
  }

  function appearanceSection() {
    const section = document.createElement('section');
    section.className = 'cp101-settings-section';
    section.innerHTML = `
      <div class="cp101-appearance-row">
        <div><strong>Aparência</strong><span>Escolha o tema da interface</span></div>
        <button id="cp101ThemeToggle" class="cp101-theme-toggle" type="button" role="switch" aria-label="Tema escuro" aria-checked="false" data-keep-settings-open="true">
          <span class="cp101-theme-segment" data-mode="dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>Escuro</span>
          <span class="cp101-theme-segment" data-mode="light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>Claro</span>
        </button>
      </div>`;
    return section;
  }

  function cleanupEmptyGroups() {
    ['.foundation-top-actions', '.cp15-top', '.cp10-release-actions'].forEach(selector => {
      const node = document.querySelector(selector);
      if (node && !node.children.length) node.remove();
    });
  }

  function relabelButtons() {
    const qualityLabel = $('#cp10QualityButton .cp10-label');
    if (qualityLabel) qualityLabel.textContent = 'Diagnóstico e erros';
    const resultsButton = $('#cp15ResultsBtn span');
    if (resultsButton) resultsButton.textContent = 'Resultados';
  }

  function decorateActions() {
    const descriptions={layoutSettingsButton:['Interface e painéis','Organize a área de trabalho'],cp15PresetsBtn:['Predefinições','Reutilize os ajustes das ferramentas'],foundationProjectsButton:['Projetos salvos','Salve e continue seu trabalho'],cp15ResultsBtn:['Resultados','Acesse os arquivos processados'],foundationQueueButton:['Fila de tarefas','Acompanhe os processamentos'],cp15FlowsBtn:['Fluxos de trabalho','Combine etapas de processamento'],foundationDiagnosticsButton:['Sistema e modo offline','Verifique os motores e a conexão'],cp10QualityButton:['Diagnóstico e erros','Consulte os logs e o compartilhamento']};
    Object.entries(descriptions).forEach(([id,[title,description]])=>{
      const button=document.getElementById(id);if(!button)return;
      const label=button.querySelector('span.label, .cp10-label, span');
      const icon=button.querySelector('svg');const badge=button.querySelector('b, .foundation-badge');
      if(!label)return;
      label.textContent=title;
      const copy=document.createElement('span');copy.className='cp101-action-copy';
      const heading=document.createElement('strong');heading.append(label);
      const detail=document.createElement('small');detail.textContent=description;copy.append(heading,detail);
      const visual=document.createElement('span');visual.className='cp101-action-icon';visual.setAttribute('aria-hidden','true');if(icon)visual.append(icon);
      button.classList.add('cp101-settings-action');button.append(visual,copy);if(badge)button.append(badge);
      const arrow=document.createElement('span');arrow.className='cp101-action-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';button.append(arrow);
    });
  }

  function bindThemeEvents() {
    $('#cp101ThemeToggle')?.addEventListener('click',()=>{
      applyTheme(document.body.dataset.theme==='dark'?'light':'dark');
    });
    syncThemeButtons();
  }

  function buildMenu() {
    const topActions = $('.top-actions');
    const helpButton = $('#helpButton');
    if (!topActions || $('#cp101SettingsMenu')) return false;

    const menu = document.createElement('div');
    menu.id = 'cp101SettingsMenu';
    menu.className = 'cp101-settings-menu';
    menu.innerHTML = `
      <button id="cp101SettingsButton" class="cp101-settings-trigger" type="button" aria-haspopup="dialog" aria-controls="cp101SettingsPanel" aria-expanded="false" title="Abrir painel de configurações rápidas">
        <svg><use href="#i-layout"></use></svg>
        <span>Configurações</span>
      </button>
      <div id="cp101SettingsPanel" class="cp101-settings-panel" role="dialog" aria-labelledby="cp101SettingsTitle" hidden>
        <div class="cp101-settings-head">
          <div><strong id="cp101SettingsTitle">Configurações</strong><span>Seu espaço de trabalho, do seu jeito.</span></div>
          <button id="cp101CloseSettings" class="cp101-settings-close" type="button" aria-label="Fechar configurações"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        </div>
        <div id="cp101SettingsBody" class="cp101-settings-body"></div>
        <div class="cp101-settings-footer"><span>CentralPDF · 2.0.1</span><span><kbd>Esc</kbd> para fechar</span></div>
      </div>
      <div id="cp101SettingsBackdrop" class="cp101-settings-backdrop" hidden></div>`;

    topActions.insertBefore(menu, helpButton || null);

    const body = $('#cp101SettingsBody');
    body.appendChild(appearanceSection());
    body.appendChild(group('Personalização', ['layoutSettingsButton','cp15PresetsBtn']));
    body.appendChild(group('Projetos e tarefas', ['foundationProjectsButton','cp15ResultsBtn','foundationQueueButton','cp15FlowsBtn']));
    body.appendChild(group('Sistema e suporte', ['foundationDiagnosticsButton','cp10QualityButton']));

    cleanupEmptyGroups();
    relabelButtons();
    decorateActions();
    bindThemeEvents();

    $('#cp101SettingsButton')?.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu();
    });
    $('#cp101CloseSettings')?.addEventListener('click', () => closeMenu(true));
    $('#cp101SettingsBackdrop')?.addEventListener('click', closeMenu);
    menu.addEventListener('focusout',event=>{
      if(event.relatedTarget&&!menu.contains(event.relatedTarget))closeMenu();
    });
    $('#cp101SettingsPanel')?.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.id === 'cp101SettingsButton' || target.id === 'cp101CloseSettings') return;
      if (target.dataset.keepSettingsOpen === 'true') return;
      setTimeout(closeMenu, 0);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('#cp101SettingsPanel')?.hidden) {event.preventDefault();closeMenu(true);}
    });
    document.addEventListener('click', (event) => {
      const wrap = $('#cp101SettingsMenu');
      if (!wrap || !wrap.contains(event.target)) closeMenu();
    });

    mounted = true;
    return true;
  }

  function mountWhenReady(attempt = 0) {
    if (mounted) return;
    if (allButtonsReady()) {
      buildMenu();
      return;
    }
    if (attempt < 80) window.setTimeout(() => mountWhenReady(attempt + 1), 100);
  }

  applyTheme(getStoredTheme());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountWhenReady());
  } else {
    mountWhenReady();
  }
})();
