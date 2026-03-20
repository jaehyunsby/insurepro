// InsurePro Service Worker v2.0 - Web Push 수신 지원

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

function getIconUrl(){ return self.registration.scope + 'icon-192.png'; }

// ── Web Push 수신 (서버에서 발송된 진짜 푸시) ──
self.addEventListener('push', e => {
  console.log('[SW] Push 수신');
  let data = { title: 'InsurePro', body: '새 알림', url: self.registration.scope, tag: 'push-'+Date.now() };
  try {
    if (e.data) {
      const parsed = e.data.json();
      data = { ...data, ...parsed };
    }
  } catch(err) {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: getIconUrl(),
      badge: getIconUrl(),
      tag: data.tag,
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      data: { url: data.url || self.registration.scope },
      actions: [
        { action: 'open',    title: '📅 일정 확인' },
        { action: 'dismiss', title: '닫기' }
      ]
    })
  );
});

// ── 앱에서 보내는 메시지 처리 (SW setTimeout 방식 fallback) ──
self.addEventListener('message', e => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'INSTANT_NOTIF') {
    self.registration.showNotification(data.title || 'InsurePro', {
      body: data.body || '',
      icon: getIconUrl(),
      badge: getIconUrl(),
      tag: 'instant-' + Date.now(),
      vibrate: [200, 100, 200],
      data: { url: data.url || self.registration.scope }
    });
  }
});

// ── 알림 클릭 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes('insurepro') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
