'use strict';
const CACHE_PREFIX = 'pts2000-terminal-' + new URL(self.registration.scope).pathname + '-';
const CACHE = CACHE_PREFIX + 'v6.0.0';
const FILES = ['./','./index.html','./desktop.css','./config.js','./codebook.js','./codec.js','./record.js','./receipt.js','./print-station.js','./archive.js','./file-entry.js','./apps.js','./shell.js','./language.js','./reception.js','./developer.js',
  './assets/fonts/terminal-cjk.woff','./assets/spiral.png',...['transmission','reception','computer','guide','record','start','wallpaper'].map(name=>'./assets/desktop/'+name+'.png'),'./assets/fonts/IBMPlexMono-Regular.ttf','./assets/fonts/IBMPlexMono-SemiBold.ttf'];
const urls = new Set(FILES.map(f => new URL(f,self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || !urls.has(event.request.url)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(event.request)) || Response.error();
  }));
});
