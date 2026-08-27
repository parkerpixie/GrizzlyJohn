const CACHE_NAME = 'grizzlyjohn-v28-family-patterns';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './today-v2.css',
  './wisdom-v2.css',
  './my-days.css',
  './settings-v2.css',
  './roam-v2.css',
  './weather.css',
  './oracle-cards.css',
  './install.css',
  './dbt-cards.css',
  './enhancements.css',
  './park-badges.css',
  './qa-fixes.css',
  './john-extras.css',
  './art-upgrades.css',
  './listen-upgrades.css',
  './app.js',
  './storage-v2.js',
  './settings-v2.js',
  './feeling-families.js',
  './wisdom-patterns.js',
  './wisdom-thoughts.js',
  './podcast-artwork.js',
  './my-days.js',
  './data.js',
  './weather.js',
  './oracle-cards.js',
  './install.js',
  './dbt-cards.js',
  './park-badges.js',
  './qa-fixes.js',
  './john-extras.js',
  './art-upgrades.js',
  './feeling-drag.js',
  './listen-upgrades.js',
  './jen-quests.js',
  './brene-reflection.js',
  './roam-v2.js',
  './backpack-suggestion.html',
  './manifest.json',
  './GrizzlyJohn%20App%20Icon.png',
  './GrizzlyJohn%20Popup%20Background.png',
  './graphics/HALT%20Skill.png',
  './graphics/Brene%20Brown%20Quote.png',
  './graphics/GrizzlyJohn%20Breathing%20Bear.png',
  './graphics/GrizzlyJohn%20Breath%20Complete%2001.png',
  './graphics/GrizzlyJohn%20Breath%20Complete%2002.png',
  './graphics/GrizzlyJohn%20Breath%20Complete%2003.png',
  './graphics/GrizzlyJohn%20Backpack.png',
  './graphics/GrizzlyJohn%20Backpack%20Idea%20Patch.png',
  './graphics/GrizzlyJohn%20Campfire%20Radio.png',
  './graphics/GrizzlyJohn%20Map%20Grizz.png',
  './graphics/GrizzlyJohn%20Binoculars%20Grizz.png',
  './graphics/GrizzlyJohn%20Blue%2001.png',
  './graphics/GrizzlyJohn%20Blue%2002.png',
  './graphics/GrizzlyJohn%20Blue%2003.png',
  './graphics/GrizzlyJohn%20Blue%2004.png',
  './graphics/GrizzlyJohn%20Blue%2005.png',
  './graphics/podcast-mel-robbins.jpg',
  './graphics/podcast-better-human.jpg',
  './graphics/podcast-ologies.jpg',
  './graphics/podcast-mrballen.jpg',
  './graphics/podcast-sysk.jpg'
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
