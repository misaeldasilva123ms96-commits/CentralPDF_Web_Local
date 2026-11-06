/* Honest, local feedback while the shared ingestion queue reads documents. */
(() => {
  'use strict';
  let active;
  function create() {
    let panel = document.getElementById('fileReadProgress');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'fileReadProgress';
    panel.className = 'file-read-progress';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Leitura de arquivos');
    panel.innerHTML = '<span class="read-spinner" aria-hidden="true"></span><div class="file-read-copy"><strong role="status" aria-live="polite"></strong><p class="read-detail"></p><details><summary>Por que pode demorar?</summary><p>Arquivos grandes ou com muitas imagens precisam de mais memória e tempo. A leitura acontece neste dispositivo; mantenha esta aba aberta.</p></details></div><small class="read-elapsed" aria-hidden="true"></small>';
    document.getElementById('dropzone')?.after(panel);
    return panel;
  }
  function start({ count, bytes }) {
    active?.finish();
    const panel = create(), started = Date.now();
    const title = panel.querySelector('[role="status"]');
    const detail = panel.querySelector('.read-detail');
    const elapsed = panel.querySelector('.read-elapsed');
    const size = bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(bytes / 1024)} KB`;
    panel.hidden = false;
    document.getElementById('fileSection')?.setAttribute('aria-busy', 'true');
    title.textContent = 'Preparando a leitura…';
    detail.textContent = `${count} arquivo(s) · ${size} · no seu dispositivo`;
    elapsed.textContent = '0 s';
    const timer = setInterval(() => { elapsed.textContent = `${Math.floor((Date.now() - started) / 1000)} s`; }, 1000);
    const job = {
      update(message) { if (active === job) title.textContent = message; },
      paint: () => new Promise(resolve => setTimeout(resolve, 32)),
      finish() {
        clearInterval(timer);
        if (active !== job) return;
        panel.hidden = true;
        document.getElementById('fileSection')?.setAttribute('aria-busy', 'false');
        active = null;
      }
    };
    active = job;
    return job;
  }
  window.CentralPDFImportFeedback = Object.freeze({ start, dismiss: () => active?.finish() });
})();
