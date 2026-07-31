(() => {
  'use strict';

  const STORAGE_KEY = 'central-pdf-layout-v0.12';
  const DEFAULTS = {
    sidebarCollapsed: false,
    settingsCollapsed: false,
    density: 'comfortable',
    showGuide: true,
    remember: true,
  };

  const $ = selector => document.querySelector(selector);
  const body = document.body;
  const workspace = $('#toolWorkspace');
  let prefs = loadPreferences();
  let focusMode = false;

  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  function persist() {
    try {
      if (prefs.remember) localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function isMobile() {
    return window.matchMedia('(max-width: 820px)').matches;
  }

  function applyPreferences() {
    body.classList.toggle('sidebar-collapsed', !isMobile() && prefs.sidebarCollapsed);
    body.classList.toggle('settings-collapsed', prefs.settingsCollapsed);
    body.classList.toggle('density-compact', prefs.density === 'compact');
    body.classList.toggle('hide-tool-guide', !prefs.showGuide);

    const sidebarExpanded = !prefs.sidebarCollapsed || isMobile();
    $('#sidebarCollapseButton')?.setAttribute('aria-expanded', String(sidebarExpanded));
    $('#sidebarCollapseButton')?.setAttribute('aria-label', sidebarExpanded ? 'Recolher barra lateral' : 'Expandir barra lateral');
    $('#sidebarCollapseButton')?.setAttribute('title', sidebarExpanded ? 'Recolher menu (F9)' : 'Expandir menu (F9)');
    $('#sidebarToggleTop')?.classList.toggle('active', !sidebarExpanded && !isMobile());
    $('#sidebarToggleTop')?.setAttribute('aria-pressed', String(!sidebarExpanded && !isMobile()));
    $('#settingsPanelToggleTop')?.classList.toggle('active', prefs.settingsCollapsed);
    $('#settingsPanelToggleTop')?.setAttribute('aria-pressed', String(prefs.settingsCollapsed));

    const density = document.querySelector(`input[name="layoutDensity"][value="${prefs.density}"]`);
    if (density) density.checked = true;
    if ($('#showToolGuidePreference')) $('#showToolGuidePreference').checked = prefs.showGuide;
    if ($('#rememberLayoutPreference')) $('#rememberLayoutPreference').checked = prefs.remember;
  }

  function toggleSidebar() {
    if (isMobile()) {
      body.classList.toggle('mobile-sidebar-open');
      const open = body.classList.contains('mobile-sidebar-open');
      $('#sidebarToggleTop')?.setAttribute('aria-expanded', String(open));
      return;
    }
    prefs.sidebarCollapsed = !prefs.sidebarCollapsed;
    persist();
    applyPreferences();
  }

  function closeMobileSidebar() {
    body.classList.remove('mobile-sidebar-open');
    $('#sidebarToggleTop')?.setAttribute('aria-expanded', 'false');
  }

  function toggleSettingsPanel() {
    prefs.settingsCollapsed = !prefs.settingsCollapsed;
    persist();
    applyPreferences();
  }

  function toggleFocusMode(force) {
    focusMode = typeof force === 'boolean' ? force : !focusMode;
    body.classList.toggle('focus-mode', focusMode);
    $('#focusModeButton')?.classList.toggle('active', focusMode);
    $('#focusModeButton')?.setAttribute('aria-pressed', String(focusMode));
    $('#focusModeButton')?.setAttribute('aria-label', focusMode ? 'Sair do modo foco' : 'Ativar modo foco');
    if (focusMode) closeMobileSidebar();
  }

  function openLayoutSettings() {
    applyPreferences();
    $('#layoutSettingsDialog')?.showModal();
  }

  function applyDialogPreferences() {
    prefs.density = document.querySelector('input[name="layoutDensity"]:checked')?.value || 'comfortable';
    prefs.showGuide = Boolean($('#showToolGuidePreference')?.checked);
    prefs.remember = Boolean($('#rememberLayoutPreference')?.checked);
    persist();
    applyPreferences();
    $('#layoutSettingsDialog')?.close();
  }

  function resetPreferences() {
    prefs = { ...DEFAULTS };
    focusMode = false;
    body.classList.remove('focus-mode', 'mobile-sidebar-open');
    persist();
    applyPreferences();
  }

  function syncWorkspaceVisibility() {
    const open = Boolean(workspace && !workspace.classList.contains('hidden'));
    body.dataset.workspaceOpen = String(open);
    if (!open) {
      closeMobileSidebar();
      toggleFocusMode(false);
    }
  }

  function decorateTooltips() {
    document.querySelectorAll('#workspaceToolNav .tool').forEach(button => {
      const label = button.querySelector('b')?.textContent?.trim() || button.textContent.trim();
      button.dataset.tooltip = label;
      if (!button.title) button.title = label;
    });
  }

  function bind() {
    $('#sidebarCollapseButton')?.addEventListener('click', toggleSidebar);
    $('#sidebarToggleTop')?.addEventListener('click', toggleSidebar);
    $('#sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);
    $('#settingsPanelToggleTop')?.addEventListener('click', toggleSettingsPanel);
    $('#settingsPanelCloseButton')?.addEventListener('click', toggleSettingsPanel);
    $('#focusModeButton')?.addEventListener('click', () => toggleFocusMode());
    $('#layoutSettingsButton')?.addEventListener('click', openLayoutSettings);
    $('#closeLayoutSettings')?.addEventListener('click', () => $('#layoutSettingsDialog')?.close());
    $('#confirmLayoutSettings')?.addEventListener('click', applyDialogPreferences);
    $('#resetLayoutPreferences')?.addEventListener('click', resetPreferences);

    document.querySelectorAll('#workspaceToolNav .tool').forEach(button => {
      button.addEventListener('click', () => { if (isMobile()) closeMobileSidebar(); });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'F9') {
        event.preventDefault();
        toggleSidebar();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFocusMode();
      }
      if (event.key === 'Escape') closeMobileSidebar();
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) closeMobileSidebar();
      applyPreferences();
    });

    if (workspace) new MutationObserver(syncWorkspaceVisibility).observe(workspace, { attributes: true, attributeFilter: ['class'] });
  }

  decorateTooltips();
  bind();
  applyPreferences();
  syncWorkspaceVisibility();

  window.CentralPDFLayout = {
    toggleSidebar,
    toggleSettingsPanel,
    toggleFocusMode,
    applyPreferences,
    resetPreferences,
    getPreferences: () => ({ ...prefs }),
  };
})();
