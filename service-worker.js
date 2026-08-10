// Minimal offline support: caches the app shell (this page + Leaflet CSS/JS)
// so the tool still opens without a connection. Map tiles (OpenStreetMap /
// OpenSeaMap) still need a live connection to load, same as any online map.

const CACHE_NAME = 'gpx-manager-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle the app shell itself with cache-first; let map tile and
  // other network requests pass straight through as normal.
  const isShellRequest = SHELL_FILES.some((f) => event.request.url.endsWith(f.replace('./', '')));
  if (!isShellRequest) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
