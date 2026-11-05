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
})();
