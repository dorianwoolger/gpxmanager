// Offline support for the GPX manager PWA.
//
// Strategy:
//  - The app shell itself (index.html / manifest.json) is fetched
//    NETWORK-FIRST, so any update pushed to GitHub Pages shows up the
//    next time the app is opened with a connection. It only falls back
//    to the cached copy when there's no network at all.
//  - Vendor assets (Leaflet CSS/JS) rarely change, so those are
//    CACHE-FIRST for speed, refreshed in the background.
//  - Everything else (map tiles etc.) passes straight through untouched.
//
// CACHE_NAME is bumped whenever this file changes — that's what makes
// browsers notice there's a new service worker and discard old caches
// (see the 'activate' handler below). Bump it again on any future change.

const CACHE_NAME = 'gpx-manager-shell-v2';
const APP_SHELL = ['./', './index.html', './manifest.json'];
const VENDOR_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(VENDOR_ASSETS)).catch(() => {})
  );
  self.skipWaiting(); // activate this new version immediately, don't wait for old tabs to close
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim(); // take control of any already-open tabs right away
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  const isAppShell = APP_SHELL.some((f) => url.endsWith(f.replace('./', '')) || url.endsWith('/'))
    || event.request.mode === 'navigate';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // offline fallback only
    );
    return;
  }

  const isVendor = VENDOR_ASSETS.includes(url);
  if (isVendor) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
  // else: let the request pass through normally (map tiles, etc.)
});
