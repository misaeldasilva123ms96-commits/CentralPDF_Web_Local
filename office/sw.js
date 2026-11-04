// Isolation is confined to the dedicated Office window, not the application.
const CACHE = 'centralpdf-office-wasm-2.7.2-pool8-v1';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(['./index.html', './engine.js', './engine.css']);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  const isEngine = url.pathname.includes('/vendor/office/');
  const isShell = url.pathname.startsWith(new URL('./', self.location.href).pathname) && !url.pathname.endsWith('/sw.js');
  if (event.request.mode !== 'navigate' && !isEngine && !isShell) return;
  event.respondWith((async () => {
    const cache = (isEngine || isShell) ? await caches.open(CACHE) : null;
    const hit = cache && await cache.match(event.request);
    const response = hit || await fetch(event.request);
    if (!hit && cache && response.ok && response.type !== 'opaque') {
      // Storage exhaustion must not turn a successful download into a failure.
      try { await cache.put(event.request, response.clone()); } catch (_) {}
    }
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    headers.set('Cache-Control', 'no-store');
    headers.set('Referrer-Policy', 'no-referrer');
    // Embind generates JavaScript wrappers. This exception is confined to the
    // isolated, credential-free Office window; the application CSP is unchanged.
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' blob:; img-src 'self' data: blob:; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  })());
});
