// SQUIRIUM BUSTER — Service Worker
// 更新時はCACHE_NAMEのバージョンを上げること（古いキャッシュは自動削除される）
const CACHE_NAME = 'squirium-buster-v2';

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

// ネットワーク優先＋オフライン時のみキャッシュへフォールバック。
// 開発中は頻繁に内容を更新するため、以前のキャッシュファースト(stale-while-revalidate)だと
// 「1回リロードしただけでは新しい版が反映されない」という更新遅延が起きていた。
// オンライン時は常に最新を取得し、オフライン時のみ直近のキャッシュで起動できるようにする。
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(
          (cached) =>
            cached ||
            new Response('オフラインです', {
              status: 503,
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            })
        )
      )
  );
});
