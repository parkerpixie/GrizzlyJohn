const CACHE_NAME = 'grizzlyjohn-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './weather.css',
  './oracle-cards.css',
  './install.css',
  './dbt-cards.css',
  './app.js',
  './data.js',
  './weather.js',
  './oracle-cards.js',
  './install.js',
  './dbt-cards.js',
  './manifest.json',
  './GrizzlyJohn%20App%20Icon.png',
  './GrizzlyJohn%20Popup%20Background.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
