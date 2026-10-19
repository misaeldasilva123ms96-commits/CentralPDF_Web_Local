importScripts('./vendor/pdfjs-manifest.js');

const CACHE_VERSION = 'centralpdf-v2.0.1-pages-36';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  './assets/css/workspace-modernization.css?v=2.0.1-ux2', './assets/js/workspace-modernization.js?v=2.0.1-ux1',
  './', './index.html', './assets/css/styles.css', './assets/css/ux-redesign.css',
  './assets/css/layout-controls.css?v=2.0.1-ui1', './assets/css/foundation.css', './assets/css/experience-0.15.css',
  './assets/css/ocr-0.16.css', './assets/css/professional-0.17.css',
  './assets/css/forms-signatures-0.18.css', './assets/css/conversions-0.19.css',
  './assets/css/intelligence-0.20.css', './assets/css/stable-1.0.css',
  './assets/css/header-settings-1.0.1.css', './assets/css/tool-cards-uniform-1.0.2.css',
  './assets/css/theme-and-visual-1.0.3.css', './assets/css/dark-theme-polish-1.0.4.css',
  './assets/css/home-dark-refine-1.0.5.css', './assets/css/dark-theme-audit-1.0.6.css',
  './assets/css/settings-fit-1.0.7.css', './assets/css/dialog-audit-1.0.8.css',
  './assets/css/modal-fit-1.0.9.css', './assets/css/micro-polish-1.1.0.css',
  './assets/css/quality-logs-1.1.2.css', './assets/css/tool-quality-1.2.0.css',
  './assets/css/workspace-visual-fixes-1.2.2.css?v=1.2.3',
  './assets/css/product-redesign-2.0.css?v=2.0.18',
  './assets/css/split-interactive.css?v=2.0.1-split1',
  './assets/js/engine-loader.js', './assets/js/pdf-ingest.js?v=2.0.1-ingest1', './assets/js/split-planner.js', './assets/js/advanced-planner.js',
  './assets/js/compression-engine.js',
  './assets/js/pdf-native-text.js?v=2.0.1-cid1', './assets/js/organizer-planner.js', './assets/js/pdf-editor.js?v=2.0.1-editor3', './assets/js/ux-enhancements.js?v=2.0.1-ui3',
  './assets/js/ocr-0.16.js?v=2.0.1-names1', './assets/js/compare-0.17.js?v=2.0.1-names1', './assets/js/redaction-0.17.js?v=2.0.1-names1',
  './assets/js/forms-signatures-0.18.js?v=0.18.2', './assets/js/conversions-0.19.js?v=2.0.1-names1',
  './assets/js/intelligence-0.20.js?v=2.0.1-names1', './assets/js/app.js?v=2.0.1-ui14', './assets/js/tool-quality-1.2.0.js?v=1.2.3',
  './assets/js/layout-controls.js?v=2.0.1-ui1', './assets/js/foundation.js?v=2.0.1-ux1', './assets/js/experience-0.15.js',
  './assets/js/diagnostics-config.js?v=2.0.1-diagnostics2', './assets/js/diagnostics-telemetry.js?v=2.0.1-diagnostics1',
  './assets/js/stable-1.0.js', './assets/js/header-settings-1.0.3.js?v=2.0.1-ui1',
  './assets/js/product-redesign-2.0.js?v=2.0.9',
  './vendor/libpdf-core.mjs', './vendor/jszip.min.js', './vendor/pptxgen.min.js',
  './vendor/pdfjs-manifest.js', './manifest.webmanifest', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', ...(self.CentralPDFPdfJsAssets || [])
];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const runtime = await caches.open(RUNTIME_CACHE);
  const obsolete = (await caches.keys()).filter(key =>
    key.startsWith('centralpdf-') && ![CORE_CACHE, RUNTIME_CACHE].includes(key));
  for (const key of obsolete) {
    if (key.endsWith('-runtime')) {
      const old = await caches.open(key);
      for (const request of await old.keys()) {
        // Versioned external engines prepared for PDF/OCR remain valid across
        // app releases. Never migrate stale same-origin application scripts.
        if (new URL(request.url).origin === self.location.origin) continue;
        if (await runtime.match(request)) continue;
        const response = await old.match(request);
        if (response) await runtime.put(request, response);
      }
    }
    // Delete only after copying succeeds, including opaque CDN responses.
    await caches.delete(key);
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.endsWith('/vendor/offline-status.js')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }

  if (url.origin === self.location.origin) {
    const networkFirst = request.mode === 'navigate'
      || url.pathname.endsWith('/index.html')
      || url.pathname.endsWith('/assets/js/pdf-editor.js')
      || (url.pathname.includes('/assets/js/') && url.pathname.endsWith('.js'));

    if (networkFirst) {
      event.respondWith((async () => {
        const runtime = await caches.open(RUNTIME_CACHE);
        let response;
        try {
          response = await fetch(request, { cache: 'no-store' });
          if (response && response.ok) {
            await runtime.put(request, response.clone());
            return response;
          }
        } catch (_) {
          // Network failures use the same fallback as HTTP 404/5xx responses.
        }
        // Prefer the latest fetched script over its install-time core copy.
        const cached = (await runtime.match(request)) || (await caches.match(request));
        return cached || response || Response.error();
      })());
      return;
    }

    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) {
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type !== 'CACHE_URLS') return;

  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(caches.open(RUNTIME_CACHE).then(async cache => {
    const results = [];
    for (const url of urls) {
      try {
        let response;
        try { response = await fetch(url, { mode: 'cors', cache: 'reload' }); }
        catch (_) { response = await fetch(url, { mode: 'no-cors', cache: 'reload' }); }
        await cache.put(url, response.clone());
        results.push({ url, ok: true });
      } catch (error) {
        results.push({ url, ok: false, error: error.message });
      }
    }
    event.source?.postMessage({ type: 'CACHE_URLS_RESULT', results });
  }));
});
