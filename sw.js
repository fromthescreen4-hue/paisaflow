const CACHE_NAME = 'paisa-flow-v1';
const ASSETS = [
  'index.html',
  'dashboard.html',
  'css/styles.css',
  'js/api.js',
  'js/auth.js',
  'js/app.js',
  'js/security.js',
  'assets/img/logo copy.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
