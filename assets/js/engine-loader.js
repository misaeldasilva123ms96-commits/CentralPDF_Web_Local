(() => {
  'use strict';

  const REMOTE_ENGINES_KEY = 'centralpdf-remote-engines-allowed';

  function remoteEnginesAllowed() {
    try { return window.localStorage.getItem(REMOTE_ENGINES_KEY) === '1'; }
    catch (_) { return false; }
  }

  window.CentralPDFRemoteEngines = Object.freeze({
    isAllowed: remoteEnginesAllowed,
    setAllowed(allowed) {
      try {
        if (allowed) window.localStorage.setItem(REMOTE_ENGINES_KEY, '1');
        else window.localStorage.removeItem(REMOTE_ENGINES_KEY);
        return true;
      } catch (_) { return false; }
    }
  });

  const definitions = [
    {
      key: 'pdfLib',
      label: 'pdf-lib',
      global: () => Boolean(window.PDFLib?.PDFDocument),
      local: 'vendor/pdf-lib.min.js',
      remote: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'
    },
    {
      key: 'pdfJs',
      label: 'PDF.js',
      global: () => Boolean(window.pdfjsLib?.getDocument),
      local: 'vendor/pdf.min.js',
      remote: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    }
  ];

  const status = {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ready: false,
    offlineReady: false,
    engines: {},
    errors: []
  };

  window.CentralPDFEngineStatus = status;
  window.CentralPDFEnginePaths = {
    pdfWorker: 'vendor/pdf.worker.min.js',
    pdfWorkerRemote: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  };

  function loadScript(url, source, definition) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.engine = definition.key;
      script.onload = () => {
        if (!definition.global()) {
          script.remove();
          reject(new Error(`${definition.label} carregou, mas a API global não foi encontrada.`));
          return;
        }
        resolve({ source, url });
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Não foi possível carregar ${definition.label} de ${source}.`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadDefinition(definition) {
    if (definition.global()) return { source: 'preloaded', url: '' };
    try {
      return await loadScript(definition.local, 'local', definition);
    } catch (localError) {
      status.errors.push(localError.message);
      if (!remoteEnginesAllowed()) {
        throw new Error(`${definition.label} local não encontrado. Execute PREPARAR_OFFLINE.bat ou autorize o download em Sistema > Preparar uso offline.`);
      }
      try {
        let source = 'internet';
        if ('caches' in window) {
          try {
            const cached = await caches.match(definition.remote);
            if (cached) source = 'cache';
          } catch (_) {}
        }
        return await loadScript(definition.remote, source, definition);
      } catch (remoteError) {
        status.errors.push(remoteError.message);
        throw remoteError;
      }
    }
  }

  window.CentralPDFEnginesReady = (async () => {
    for (const definition of definitions) {
      try {
        const result = await loadDefinition(definition);
        status.engines[definition.key] = {
          label: definition.label,
          ready: true,
          source: result.source,
          url: result.url
        };
      } catch (error) {
        status.engines[definition.key] = {
          label: definition.label,
          ready: false,
          source: 'indisponível',
          error: error.message
        };
      }
    }
    status.ready = definitions.every(item => status.engines[item.key]?.ready);
    status.offlineReady = definitions.every(item => ['local', 'preloaded', 'cache'].includes(status.engines[item.key]?.source));
    status.finishedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('centralpdf-engines-ready', { detail: status }));
    return status;
  })();
})();
