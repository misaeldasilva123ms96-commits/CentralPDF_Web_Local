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
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  }

  function applyTheme(mode) {
    const theme = mode === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
    syncThemeButtons(theme);
  }

  function syncThemeButtons(theme = getStoredTheme()) {
    document.querySelectorAll('.cp101-theme-option').forEach((button) => {
      const active = button.dataset.themeMode === theme;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function allButtonsReady() {
    return buttonIds.every(id => document.getElementById(id));
  }

  function closeMenu() {
    const panel = $('#cp101SettingsPanel');
    const trigger = $('#cp101SettingsButton');
    const backdrop = $('#cp101SettingsBackdrop');
    if (!panel || !trigger) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    backdrop?.setAttribute('hidden', 'hidden');
  }

  function openMenu() {
    const panel = $('#cp101SettingsPanel');
    const trigger = $('#cp101SettingsButton');
    const backdrop = $('#cp101SettingsBackdrop');
    if (!panel || !trigger) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    backdrop?.removeAttribute('hidden');
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
      <div class="cp101-settings-section-title">Aparência</div>
      <div class="cp101-theme-section">
        <div class="cp101-theme-head">
          <div>
            <strong>Tema da interface</strong>
            <span>Escolha entre modo claro e escuro. A preferência fica salva neste navegador.</span>
          </div>
          <span class="cp101-theme-badge">Visual</span>
        </div>
        <div class="cp101-theme-options" role="group" aria-label="Escolha o tema da interface">
          <button type="button" class="cp101-theme-option" data-theme-mode="light" data-keep-settings-open="true" aria-pressed="false">
            <span class="swatch"><svg><use href="#i-eye"></use></svg></span>
            <span><b>Tema claro</b><small>Limpo, suave e ideal para o dia.</small></span>
          </button>
          <button type="button" class="cp101-theme-option" data-theme-mode="dark" data-keep-settings-open="true" aria-pressed="false">
            <span class="swatch"><svg><use href="#i-focus"></use></svg></span>
            <span><b>Tema escuro</b><small>Mais confortável para uso prolongado.</small></span>
          </button>
        </div>
        <div class="cp101-theme-note">Dica: o tema vale para toda a Central PDF & Imagem.</div>
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
    if (qualityLabel) qualityLabel.textContent = 'Qualidade 1.2.1';
    const resultsButton = $('#cp15ResultsBtn span');
    if (resultsButton) resultsButton.textContent = 'Resultados';
  }

  function bindThemeEvents() {
    document.querySelectorAll('.cp101-theme-option').forEach((button) => {
      button.addEventListener('click', () => {
        applyTheme(button.dataset.themeMode);
      });
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
      <button id="cp101SettingsButton" class="cp101-settings-trigger" type="button" aria-haspopup="true" aria-expanded="false" title="Abrir painel de configurações rápidas">
        <svg><use href="#i-layout"></use></svg>
        <span>Configurações</span>
      </button>
      <div id="cp101SettingsPanel" class="cp101-settings-panel" hidden>
        <div class="cp101-settings-head">
          <small>Atalhos do produto</small>
          <strong>Configurações rápidas</strong>
          <span>Reunimos projetos, resultados, fluxos, diagnósticos, qualidade e aparência em um painel mais limpo.</span>
        </div>
        <div id="cp101SettingsBody" class="cp101-settings-body"></div>
        <div class="cp101-settings-footer">
          <span>Feche com Esc ou clicando fora.</span>
          <button id="cp101CloseSettings" type="button">Fechar</button>
        </div>
      </div>
      <div id="cp101SettingsBackdrop" class="cp101-settings-backdrop" hidden></div>`;

    topActions.insertBefore(menu, helpButton || null);

    const body = $('#cp101SettingsBody');
    body.appendChild(appearanceSection());
    body.appendChild(group('Projetos e sistema', ['foundationProjectsButton', 'foundationQueueButton', 'foundationDiagnosticsButton']));
    body.appendChild(group('Continuidade', ['cp15ResultsBtn', 'cp15FlowsBtn', 'cp15PresetsBtn']));
    body.appendChild(group('Qualidade da versão', ['cp10QualityButton'], 'cp101-settings-slim'));

    cleanupEmptyGroups();
    relabelButtons();
    bindThemeEvents();

    $('#cp101SettingsButton')?.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu();
    });
    $('#cp101CloseSettings')?.addEventListener('click', closeMenu);
    $('#cp101SettingsBackdrop')?.addEventListener('click', closeMenu);
    $('#cp101SettingsPanel')?.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.id === 'cp101SettingsButton' || target.id === 'cp101CloseSettings') return;
      if (target.dataset.keepSettingsOpen === 'true') return;
      setTimeout(closeMenu, 0);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
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
