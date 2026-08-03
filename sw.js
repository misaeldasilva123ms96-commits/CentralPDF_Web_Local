importScripts('./vendor/pdfjs-manifest.js');

const CACHE_VERSION = 'centralpdf-v1.2.1-pages-3';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  './', './index.html', './assets/css/styles.css', './assets/css/ux-redesign.css',
  './assets/css/layout-controls.css', './assets/css/foundation.css', './assets/css/experience-0.15.css',
  './assets/css/ocr-0.16.css', './assets/css/professional-0.17.css',
  './assets/css/forms-signatures-0.18.css', './assets/css/conversions-0.19.css',
  './assets/css/intelligence-0.20.css', './assets/css/stable-1.0.css',
  './assets/css/header-settings-1.0.1.css', './assets/css/tool-cards-uniform-1.0.2.css',
  './assets/css/theme-and-visual-1.0.3.css', './assets/css/dark-theme-polish-1.0.4.css',
  './assets/css/home-dark-refine-1.0.5.css', './assets/css/dark-theme-audit-1.0.6.css',
  './assets/css/settings-fit-1.0.7.css', './assets/css/dialog-audit-1.0.8.css',
  './assets/css/modal-fit-1.0.9.css', './assets/css/micro-polish-1.1.0.css',
  './assets/css/quality-logs-1.1.2.css', './assets/css/tool-quality-1.2.0.css',
  './assets/css/workspace-visual-fixes-1.2.2.css',
  './assets/js/engine-loader.js', './assets/js/split-planner.js', './assets/js/advanced-planner.js',
  './assets/js/organizer-planner.js', './assets/js/pdf-editor.js', './assets/js/ux-enhancements.js',
  './assets/js/ocr-0.16.js', './assets/js/compare-0.17.js', './assets/js/redaction-0.17.js',
  './assets/js/forms-signatures-0.18.js', './assets/js/conversions-0.19.js',
  './assets/js/intelligence-0.20.js', './assets/js/app.js', './assets/js/tool-quality-1.2.0.js',
  './assets/js/layout-controls.js', './assets/js/foundation.js', './assets/js/experience-0.15.js',
  './assets/js/stable-1.0.js', './assets/js/header-settings-1.0.3.js',
  './vendor/libpdf-core.mjs', './vendor/jszip.min.js', './vendor/pptxgen.min.js',
  './vendor/pdfjs-manifest.js', './manifest.webmanifest', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', ...(self.CentralPDFPdfJsAssets || [])
];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith('centralpdf-') && ![CORE_CACHE, RUNTIME_CACHE].includes(key))
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

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
      || url.pathname.endsWith('/assets/js/pdf-editor.js');

    if (networkFirst) {
      event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(request)));
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
