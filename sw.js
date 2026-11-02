/* Air Hockey service worker.
   To ship an update: bump VERSION here AND APP_VERSION in index.html.
   Browsers re-download sw.js on every check (updateViaCache: 'none'); any byte change
   installs a new worker, which re-fetches the app shell past every HTTP cache and then
   waits until the player taps "Update". */
const VERSION = '0.01';
const CACHE = `airhockey-${VERSION}`;
const RUNTIME = 'airhockey-cdn';              // pinned third-party files; versioned URLs, kept across updates

const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon.svg', 'icons/favicon-32.png',
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js',
];
const CACHE_FIRST_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache-busting: a versioned query plus cache:'reload' skips the browser and CDN caches,
    // and each response is stored under its clean URL
    await Promise.all(SHELL.map(async url => {
      const busted = new URL(url, self.registration.scope);
      busted.searchParams.set('v', VERSION);
      const res = await fetch(busted, { cache: 'reload' });
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      await cache.put(new URL(url, self.registration.scope).href, res);
    }));
    // best effort: lets the game start offline the first time it's reopened
    const rt = await caches.open(RUNTIME);
    await Promise.allSettled(CDN.map(async url => {
      if (await rt.match(url)) return;
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) await rt.put(url, res);
    }));
  })());
  // no skipWaiting here: the page asks the player first
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('airhockey-') && k !== CACHE && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // the app shell: from this version's cache, so a release is all-or-nothing
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      if (req.mode === 'navigate') {
        return (await cache.match(new URL('./', self.registration.scope).href)) ||
               (await cache.match(new URL('index.html', self.registration.scope).href)) || fetch(req);
      }
      return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
    })());
    return;
  }

  // pinned libraries and font files never change at a given URL
  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const rt = await caches.open(RUNTIME);
      const hit = await rt.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') rt.put(req, res.clone());
      return res;
    })());
    return;
  }

  // the Google Fonts stylesheet: serve what we have, refresh in the background
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith((async () => {
      const rt = await caches.open(RUNTIME);
      const hit = await rt.match(req);
      const net = fetch(req).then(res => { if (res.ok) rt.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
  // everything else (the online-play matchmaking service) goes straight to the network
});
