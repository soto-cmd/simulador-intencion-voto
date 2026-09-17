const CACHE_NAME = 'sim-voto-static-v2';
const CORE_ASSETS = [
  './styles.css?v=20260917i',
  './polish.css?v=20260917h',
  './candidate-ui.css?v=20260917g',
  './mobile.css?v=20260917a',
  './ui-audit.css?v=20260917r',
  './app.js?v=20260917i',
  './candidate-ui.js?v=20260917g',
  './referral.js?v=20260917r',
  './sprite-helper.js?v=20260917r',
  './residence-select.js?v=20260917r',
  './referral-share-social.js?v=20260917r',
  './assets/candidates/anr-sprite.webp',
  './assets/candidates/plra-sprite.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  if (isDocument) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then(r => r || caches.match('./')))
    );
    return;
  }

  const cacheable = ['style','script','image','font'].includes(request.destination) || /\.(?:css|js|webp|png|jpg|jpeg|svg|woff2?)(?:\?|$)/i.test(url.pathname + url.search);
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
