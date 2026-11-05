/* Presentation measurement only. Tool state and event ownership stay unchanged. */
(() => {
  'use strict';
  if (document.body.dataset.design !== '3') return;
  const header = document.querySelector('.topbar');
  if (!header) return;
  const measure = () => document.body.style.setProperty('--cd-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
  measure();
  if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(header);
  else window.addEventListener('resize', measure, { passive: true });

  // The approved menu lists the same conversion cards as the home page.
  // Reuse their real click handlers, including Office presets and guards.
  const converter = document.getElementById('converterMenu');
  if (converter) {
    const title = document.createElement('h2');
    title.textContent = 'Converter PDF e arquivos';
    const grid = document.createElement('div');
    grid.className = 'cd-converter-grid';
    document.querySelectorAll('.tool-card[data-category="convert"]').forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.conversion = card.querySelector('strong').textContent.trim();
      const icon = document.createElement('span');
      icon.className = 'cp2-format-icon';
      icon.dataset.iconTone = card.dataset.iconTone;
      icon.setAttribute('aria-hidden', 'true');
      const svg = card.querySelector('.tool-card-icon svg');
      if (svg) icon.append(svg.cloneNode(true));
      const label = document.createElement('span');
      label.textContent = button.dataset.conversion;
      button.append(icon, label);
      button.addEventListener('click', () => card.click());
      grid.append(button);
    });
    converter.replaceChildren(title, grid);
  }

  const summary = document.querySelector('.cp2-mega-toolbar>strong');
  if (summary) summary.textContent = `Todas as ${document.querySelectorAll('.tool-card[data-tool]').length} ferramentas`;
  const conversionHeading = document.querySelector('[data-category-group="convert"] h2');
  if (conversionHeading) conversionHeading.textContent = 'Converter';

  const menus = [
    ['converterMenuButton', 'converterMenu'],
    ['allToolsMenuButton', 'allToolsMegaMenu']
  ];
  const placeMenus = () => menus.forEach(([triggerId, panelId]) => {
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    if (!trigger || !panel || trigger.getAttribute('aria-expanded') !== 'true') return;
    const anchor = trigger.getBoundingClientRect();
    const width = panel.getBoundingClientRect().width;
    panel.style.left = `${Math.max(12, Math.min(anchor.left, innerWidth - width - 12))}px`;
    panel.style.top = `${anchor.bottom + 8}px`;
    panel.style.maxHeight = `${Math.max(80, Math.min(560, innerHeight * .68, innerHeight - anchor.bottom - 24))}px`;
  });
  menus.forEach(([id]) => {
    const trigger = document.getElementById(id);
    trigger?.addEventListener('click', placeMenus);
    trigger?.addEventListener('keydown', event => {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) placeMenus();
    });
  });
  document.addEventListener('keydown', event => {
    const trigger = document.getElementById('allToolsMenuButton');
    if (event.key === 'Escape' && trigger?.getAttribute('aria-expanded') === 'true') {
      requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
    }
  }, true);
  document.getElementById('primaryProductNav')?.addEventListener('scroll', placeMenus, { passive: true });
  window.addEventListener('resize', placeMenus);
  window.addEventListener('scroll', placeMenus, { passive: true });
})();
