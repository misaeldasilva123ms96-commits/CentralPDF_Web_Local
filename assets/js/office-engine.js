(() => {
  'use strict';
  let channel, ready = false, activating = null;
  let heartbeat, probeTimer, probeID;
  let activationError = null;
  let rejectActivation, activationTimer;
  const pending = new Map();
  const nonce = length => Array.from(crypto.getRandomValues(new Uint8Array(length)), v => v.toString(16).padStart(2, '0')).join('');
  function notify(message) {
    document.querySelectorAll('[data-office-engine-status]').forEach(el => { el.textContent = message; });
  }
  function reset(message = 'Conversão encerrada. Clique em converter para tentar novamente.') {
    clearInterval(heartbeat); clearTimeout(probeTimer); probeID = null;
    clearTimeout(activationTimer); activationTimer = null;
    const reject = rejectActivation; rejectActivation = null;
    if (!ready) reject?.(new Error(message));
    ready = false;
    for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error(message)); }
    pending.clear();
    channel?.close();
    channel = null;
    activating = null;
    notify(message);
  }
  function activate() {
    if (ready) { notify('Preparação concluída.'); return Promise.resolve(); }
    if (activating) return activating;
    activationError = null;
    if (!window.isSecureContext || !('BroadcastChannel' in window) || !('serviceWorker' in navigator)) {
      return Promise.reject(new Error('Abra o site por HTTPS ou pela edição local, em um navegador atualizado.'));
    }
    const token = nonce(24);
    channel = new BroadcastChannel(`centralpdf-office-${token}`);
    const url = new URL('office/index.html', document.baseURI);
    url.hash = `channel=${token}`;
    const popup = window.open(url.href, `centralpdf-office-${token}`, 'popup,width=580,height=600');
    if (!popup) { reset(); activationError = new Error('Permita a janela de conversão neste site e clique em converter novamente.'); return Promise.reject(activationError); }
    notify('Preparando conversão…');
    activating = new Promise((resolve, reject) => {
      rejectActivation = reject;
      const timer = setTimeout(() => { channel?.postMessage({ type: 'stop' }); reject(new Error('A preparação demorou demais. Confira a conexão e tente converter novamente.')); reset(); }, 320000);
      activationTimer = timer;
      channel.onmessage = ({ data }) => {
        if (data?.type === 'ready') {
          clearTimeout(timer); rejectActivation = null; activationTimer = null; ready = true; activating = null;
          clearInterval(heartbeat);
          heartbeat = setInterval(() => {
            if (probeID || !ready || !channel) return;
            probeID = nonce(12);
            channel.postMessage({ type: 'ping', id: probeID });
            probeTimer = setTimeout(() => reset('A janela de conversão foi fechada ou deixou de responder. Tente novamente.'), 7000);
          }, 2000);
          notify('Preparação concluída.'); resolve(); return;
        }
        if (data?.type === 'pong' && data.id === probeID) {
          clearTimeout(probeTimer); probeID = null;
          if (!data.ready) reset();
          return;
        }
        if (data?.type === 'closed') {
          clearTimeout(timer);
          const message = data.reason === 'cancelled' ? 'Operação cancelada pelo usuário.' : 'A janela de conversão foi encerrada.';
          reject(new Error(message)); reset(message); return;
        }
        if (data?.type === 'progress') return;
        if (data?.id && pending.has(data.id)) {
          const job = pending.get(data.id); clearTimeout(job.timer); pending.delete(data.id);
          if (data.type === 'result' && data.bytes instanceof ArrayBuffer && data.bytes.byteLength <= 100 * 1024 * 1024) job.resolve(new Blob([data.bytes], { type: 'application/pdf' }));
          else job.reject(new Error(data.message || 'O motor não retornou um PDF válido.'));
        } else if (data?.type === 'error') {
          clearTimeout(timer); reject(new Error(data.message)); reset(data.message);
        }
      };
    });
    return activating;
  }
  async function convert(file, cancelled) {
    if (file.size > 25 * 1024 * 1024) throw new Error('A conversão de documentos aceita até 25 MB por arquivo.');
    if (!ready || !channel) {
      window.CentralPDFApp?.reportProcessingStage?.('Preparando conversão…');
      if (activationError && !activating) throw activationError;
      let preparationCancellation;
      if (cancelled) preparationCancellation = setInterval(() => {
        if (cancelled()) { channel?.postMessage({ type: 'stop' }); reset('Operação cancelada pelo usuário.'); }
      }, 300);
      try { await (activating || activate()); }
      finally { clearInterval(preparationCancellation); }
    }
    if (!ready || !channel) throw new Error('Não foi possível preparar esta conversão. Tente novamente.');
    const id = nonce(12);
    const bytes = await file.arrayBuffer();
    if (cancelled?.()) throw new Error('Operação cancelada pelo usuário.');
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (cancelled?.()) {
          channel?.postMessage({ type: 'stop' });
          reset('Conversão cancelada.');
        }
      }, 300);
      const finish = handler => value => { clearInterval(interval); handler(value); };
      const timer = setTimeout(() => { channel?.postMessage({ type: 'stop' }); reset('O documento excedeu o tempo de conversão. Tente novamente.'); }, 130000);
      pending.set(id, { timer, resolve: finish(resolve), reject: finish(reject) });
      channel.postMessage({ type: 'convert', id, bytes, extension: file.name.split('.').pop().toLowerCase(), outputFormat: 'pdf' });
    });
  }
  function mount() {
    // Runtime preparation is automatic; no dependency-install controls in UI.
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('#processButton');
    if (!button || button.disabled || ready || activating || window.CentralPDFApp?.getActiveTool?.() !== 'documentsToPdf') return;
    if (document.querySelector('#docToPdfEngine')?.value === 'text') return;
    const files = window.CentralPDFApp.getFiles();
    const officeFiles = files.filter(file => /\.(docx?|odt|xlsx?|ods|pptx?|odp|rtf|html?|csv)$/i.test(file.name));
    if (!officeFiles.length || officeFiles.some(file => file.size > 25 * 1024 * 1024)) return;
    // Open during the original user gesture, before asynchronous preflight.
    activate().catch(error => { activationError = error; });
  }, true);
  window.addEventListener('centralpdf-result', event => {
    if (event.detail?.tool !== 'documentsToPdf' || !channel || !ready) return;
    channel.postMessage({ type: 'complete' });
    reset('Conversão concluída.');
  });
  window.addEventListener('pagehide', () => { channel?.postMessage({ type: 'stop' }); reset(); });
  window.CentralPDFOfficeEngine = Object.freeze({ activate, convert, mount, isReady: () => ready });
})();
