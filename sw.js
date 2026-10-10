// Level Up — service worker (GitHub Pages edition).
//   - Other origins (Google, Anthropic, CDNs) → not touched, always network
//   - index.html / "./" → network-first, cache fallback
//   - Own static files (.jsx, .js, .svg, .json) → cache-first, refreshed in background
// Bump CACHE_NAME when shipping new static files.
// All fetches skip the browser's HTTP cache (GitHub Pages sends max-age=600),
// otherwise a new version can be filled with the previous version's files.

const CACHE_NAME = 'levelup-gh-v15';
const PRECACHE = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'icon-maskable.svg', 'lu-store.js', 'linkedin-bookmarklet.js',
  'app.jsx', 'bits.jsx', 'brand.jsx', 'curator.jsx', 'dashboard.jsx', 'detail.jsx', 'inbox.jsx',
  'modals.jsx', 'network.jsx', 'personas.jsx', 'pipeline.jsx', 'settings.jsx', 'tweaks-panel.jsx',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req, { cache: 'no-cache' }).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
