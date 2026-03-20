// InsurePro Service Worker v1.0
// 브라우저가 닫혀있어도 일정 알림을 받을 수 있습니다

const CACHE_NAME = 'insurepro-v1';

// ── 설치 ──
self.addEventListener('install', e => {
  console.log('[SW] 설치 완료');
  self.skipWaiting();
});

// ── 활성화 ──
self.addEventListener('activate', e => {
  console.log('[SW] 활성화 완료');
  e.waitUntil(self.clients.claim());
});

// ── 메시지 수신 (index.html → SW) ──
self.addEventListener('message', e => {
  const data = e.data;
  if(!data) return;

  // 일정 알림 예약
  if(data.type === 'SCHEDULE_ALARM'){
    const { id, title, body, delay, url } = data;
    console.log(`[SW] 알림 예약: ${title} (${Math.round(delay/1000/60)}분 후)`);

    // delay ms 후 알림 발송
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/insurepro/icon-192.png',
        badge: '/insurepro/icon-192.png',
        tag: id || 'insurepro-schedule',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        silent: false,
        data: { url: url || '/insurepro/' },
        actions: [
          { action: 'open', title: '일정 확인' },
          { action: 'dismiss', title: '닫기' }
        ]
      });
    }, Math.max(delay, 0));
  }

  // 즉시 알림 (테스트용)
  if(data.type === 'INSTANT_NOTIF'){
    self.registration.showNotification(data.title || 'InsurePro', {
      body: data.body || '',
      icon: '/insurepro/icon-192.png',
      badge: '/insurepro/icon-192.png',
      tag: 'instant-' + Date.now(),
      vibrate: [200, 100, 200],
      data: { url: data.url || '/insurepro/' }
    });
  }

  // 예약된 알림 취소 (일정 삭제 시)
  if(data.type === 'CANCEL_ALARM'){
    self.registration.getNotifications({ tag: data.id }).then(notifs => {
      notifs.forEach(n => n.close());
    });
  }
});

// ── 알림 클릭 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if(e.action === 'dismiss') return;

  const url = e.notification.data?.url || '/insurepro/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // 이미 열린 탭이 있으면 포커스
      for(const client of clients){
        if(client.url.includes('insurepro') && 'focus' in client){
          return client.focus();
        }
      }
      // 없으면 새 탭 열기
      return self.clients.openWindow(url);
    })
  );
});

// ── 알림 닫기 ──
self.addEventListener('notificationclose', e => {
  console.log('[SW] 알림 닫힘:', e.notification.tag);
});
