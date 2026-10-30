// Wortschatz：オフラインで使うための保存係
// ネットにつながっている時は、いつも最新版を取りにいく（つながらない時だけ保存済みのものを使う）
const CACHE = 'wortschatz-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => fetch(f, {cache: 'reload'}).then(r => r.ok && c.put(f, r)).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || e.request.url.endsWith('/') || e.request.url.endsWith('.html');
  if (isPage) {
    // ページ本体：まずネットから最新版（HTTPの一時保存も使わない）
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // アイコン・文字の形など：保存済みを使い、裏で更新
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, {ignoreSearch: true});
      const fresh = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
