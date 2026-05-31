const CACHE = 'tga-v1';
const PRECACHE = ['./', './index.html', './manifest.json', './icon.svg', './icon-maskable.svg'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'unpkg.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Own origin: cache-first, fallback to network then cache
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // CDN resources: stale-while-revalidate
  if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(resp => {
            cache.put(e.request, resp.clone());
            return resp;
          });
          return cached || fresh;
        })
      )
    );
  }
});
