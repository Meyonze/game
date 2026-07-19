// SQUIRIUM BUSTER — Service Worker
// 更新時はCACHE_NAMEのバージョンを上げること（古いキャッシュは自動削除される）
const CACHE_NAME = 'squirium-buster-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュファースト＋バックグラウンド更新（stale-while-revalidate）
// 本ゲームは外部リソース（フォント/画像/CDN）を一切使わない単一HTMLのため、
// 初回読み込み時にページ自体がキャッシュされ、以降はオフラインでも起動できる
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await networkFetch) || new Response('オフラインです', {
        status: 503,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    })
  );
});
