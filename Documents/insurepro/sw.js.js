// InsurePro Service Worker
// 오프라인에서도 앱이 열리도록 캐싱 처리

const CACHE_NAME = 'insurepro-v1';
const CACHE_URLS = [
  '/insurepro.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// 설치: 핵심 파일 캐싱
self.addEventListener('install', event => {
  console.log('[SW] 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS.map(url => new Request(url, { mode: 'no-cors' })));
    }).catch(err => console.warn('[SW] 캐싱 일부 실패 (정상):', err))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', event => {
  console.log('[SW] 활성화...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 가로채기: Cache First 전략
self.addEventListener('fetch', event => {
  // Supabase API 요청은 캐시 안 함 (항상 네트워크)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 성공한 GET 요청만 캐시에 저장
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 오프라인 fallback
        if (event.request.destination === 'document') {
          return caches.match('/insurepro.html');
        }
      });
    })
  );
});
