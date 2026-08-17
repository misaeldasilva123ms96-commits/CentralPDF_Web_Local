(() => {
  'use strict';

  const APP_VERSION = '2.0.1';
  const runtimeProtocol = window.CentralPDFProtocolOverride || location.protocol;
  const PDFJS_VERSION = '6.2.108';
  const PDFLIB_VERSION = '1.17.1';
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

  /*
   * Este pacote ainda não distribui os motores PDF de terceiros dentro de
   * vendor/. Portanto, não tentamos abrir arquivos locais inexistentes. Isso
   * evita logs falsos de recurso antes do fallback online.
   */
  const offlineStatus = window.CentralPDFOfflineStatus || {};
  const bundled = Object.freeze({
    pdfLib: Boolean(offlineStatus.pdfLib),
    pdfJs: Boolean(offlineStatus.pdfJs),
    pdfWorker: Boolean(offlineStatus.pdfWorker)
  });

  const definitions = [
    {
      key: 'pdfLib',
      label: 'pdf-lib',
      global: () => Boolean(window.PDFLib?.PDFDocument),
      local: 'vendor/pdf-lib.min.js',
      remote: `https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/${PDFLIB_VERSION}/pdf-lib.min.js`
    },
    {
      key: 'pdfJs',
      label: 'PDF.js',
      global: () => Boolean(window.pdfjsLib?.getDocument),
      module: true,
      local: 'vendor/pdfjs/pdf.min.mjs',
      remote: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.min.mjs`
    }
  ];

  const status = {
    appVersion: APP_VERSION,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ready: false,
    offlineReady: false,
    directFileMode: runtimeProtocol === 'file:',
    bundled: { ...bundled },
    engines: {},
    pdfWorker: { ready: false, mode: 'not-configured', source: '', error: '' },
    errors: [],
    warnings: []
  };

  window.CentralPDFEngineStatus = status;
  window.CentralPDFRuntimeFixes = Object.assign({}, window.CentralPDFRuntimeFixes, {
    pdfWorkerLifecycle: runtimeProtocol === 'file:' ? 'direct-file-esm-unsupported' : 'worker-src-per-document',
    pdfWorkerBlobWrapperDisabled: true,
    pdfJsEvalDisabled: true,
    adaptiveCompression: 'multi-pass-target-selection'
  });
  window.CentralPDFEnginePaths = {
    pdfWorker: 'vendor/pdfjs/pdf.worker.min.mjs',
    pdfWorkerRemote: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.min.mjs`,
    pdfResources: 'vendor/pdfjs/'
  };

  function currentWorkerUrl() {
    const paths = window.CentralPDFEnginePaths || {};
    if (bundled.pdfWorker) {
      const local = paths.pdfWorker || 'vendor/pdfjs/pdf.worker.min.mjs';
      try { return new URL(local, document.baseURI).href; } catch (_) { return local; }
    }
    if (remoteEnginesAllowed()) {
      return paths.pdfWorkerRemote || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.min.mjs`;
    }
    return '';
  }

  window.CentralPDFResolvePdfWorker = currentWorkerUrl;
  window.CentralPDFGetPdfWorkerStatus = () => ({ ...status.pdfWorker, workerPort: false });

  function installPdfJsApi(api, resourceRoot) {
    if (api?.__centralPDFSecured) {
      window.pdfjsLib = api;
      return;
    }

    const root = new URL(resourceRoot, document.baseURI);
    const securedApi = {
      ...api,
      __centralPDFSecured: true,
      getDocument(input) {
        let source;
        if (typeof input === 'string' || input instanceof URL) source = { url: String(input) };
        else if (input instanceof Uint8Array || input instanceof ArrayBuffer) source = { data: input };
        else source = { ...(input || {}) };

        const loadingTask = api.getDocument({
          cMapUrl: new URL('cmaps/', root).href,
          cMapPacked: true,
          iccUrl: new URL('iccs/', root).href,
          standardFontDataUrl: new URL('standard_fonts/', root).href,
          wasmUrl: new URL('wasm/', root).href,
          ...source,
          // Defesa em profundidade contra GHSA-wgrm-67xf-hhpq. Mantemos
          // desativado mesmo usando uma versão corrigida do PDF.js.
          isEvalSupported: false
        });

        const documentPromise = loadingTask.promise.then(documentProxy => {
          // PDF.js 6 moveu destroy() do proxy para a loading task. O alias
          // preserva a API usada pelas ferramentas atuais durante a migração.
          if (typeof documentProxy.destroy !== 'function' && Object.isExtensible(documentProxy)) {
            Object.defineProperty(documentProxy, 'destroy', {
              configurable: true,
              value: () => loadingTask.destroy()
            });
          }
          return documentProxy;
        });
        Object.defineProperty(loadingTask, 'promise', { configurable: true, value: documentPromise });
        return loadingTask;
      }
    };
    window.pdfjsLib = Object.freeze(securedApi);
  }

  async function loadScript(url, source, definition) {
    if (definition.module) {
      try {
        const moduleUrl = new URL(url, document.baseURI).href;
        const resourceRoot = source === 'local'
          ? (window.CentralPDFEnginePaths?.pdfResources || 'vendor/pdfjs/')
          : `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/`;
        installPdfJsApi(await import(moduleUrl), resourceRoot);
        return { source, url: moduleUrl };
      } catch (error) {
        throw new Error(`Não foi possível carregar ${definition.label} de ${source}: ${error.message || error}`);
      }
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.crossOrigin = source === 'internet' ? 'anonymous' : '';
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
    if (definition.global()) {
      if (definition.key === 'pdfJs') {
        installPdfJsApi(window.pdfjsLib, window.CentralPDFEnginePaths?.pdfResources || 'vendor/pdfjs/');
      }
      return { source: 'preloaded', url: '' };
    }

    if (bundled[definition.key] && definition.local) {
      try {
        return await loadScript(definition.local, 'local', definition);
      } catch (localError) {
        status.warnings.push(localError.message);
      }
    }

    if (!remoteEnginesAllowed()) {
      throw new Error(`${definition.label} local não encontrado. Execute PREPARAR_OFFLINE.bat ou autorize o download em Sistema > Preparar uso offline.`);
    }

    let source = 'internet';
    if ('caches' in window) {
      try {
        const cached = await caches.match(definition.remote);
        if (cached) source = 'cache';
      } catch (_) {}
    }
    return loadScript(definition.remote, source, definition);
  }

  async function preparePdfWorker() {
    const pdfjs = window.pdfjsLib;
    const options = pdfjs?.GlobalWorkerOptions;
    if (!pdfjs?.getDocument || !options) {
      status.pdfWorker = { ready: false, mode: 'pdfjs-unavailable', source: '', error: 'PDF.js não está disponível.' };
      return status.pdfWorker;
    }

    if (options.workerPort) {
      try { options.workerPort.terminate?.(); } catch (_) {}
      try { options.workerPort = null; } catch (_) {}
    }

    const paths = window.CentralPDFEnginePaths || {};
    const useLocalWorker = bundled.pdfWorker;
    const localWorkerPath = paths.pdfWorker || 'vendor/pdfjs/pdf.worker.min.mjs';
    let localWorkerUrl = localWorkerPath;
    try { localWorkerUrl = new URL(localWorkerPath, document.baseURI).href; } catch (_) {}
    const sourceUrl = useLocalWorker ? localWorkerUrl : currentWorkerUrl();
    const source = useLocalWorker ? 'local' : 'internet';

    if (!sourceUrl) {
      status.pdfWorker = { ready: false, mode: 'remote-disabled', source: '', error: 'Motores remotos não autorizados.' };
      return status.pdfWorker;
    }

    try {
      if (runtimeProtocol === 'file:') {
        status.pdfWorker = {
          ready: false,
          mode: 'direct-file-esm-unsupported',
          source,
          sourceUrl,
          error: 'PDF.js 6 usa módulos ESM. Abra o aplicativo pelo servidor local ou pelo executável.'
        };
        status.warnings.push(status.pdfWorker.error);
        return status.pdfWorker;
      }

      options.workerSrc = sourceUrl;
      status.pdfWorker = { ready: true, mode: 'worker-src-per-document', source, sourceUrl, error: '' };
    } catch (error) {
      options.workerSrc = sourceUrl;
      status.pdfWorker = {
        ready: false,
        mode: runtimeProtocol === 'file:' ? 'main-thread-fallback-failed' : 'worker-src-fallback',
        source,
        sourceUrl,
        error: error?.message || String(error)
      };
      status.warnings.push(`Worker PDF em modo de compatibilidade: ${status.pdfWorker.error}`);
    }
    return status.pdfWorker;
  }

  window.CentralPDFPdfWorkerReady = Promise.resolve(null);

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
        status.errors.push(error.message);
      }
    }

    status.ready = definitions.every(item => status.engines[item.key]?.ready);
    status.offlineReady = definitions.every(item => ['local', 'preloaded', 'cache'].includes(status.engines[item.key]?.source)) && bundled.pdfWorker;

    window.CentralPDFPdfWorkerReady = preparePdfWorker();
    await window.CentralPDFPdfWorkerReady;

    status.finishedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('centralpdf-engines-ready', { detail: status }));
    return status;
  })();

})();
