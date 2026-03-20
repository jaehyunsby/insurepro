// InsurePro Service Worker v1.1
const SW_VERSION = 'insurepro-sw-v1.1';

self.addEventListener('install', e => {
  console.log('[SW] 설치:', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] 활성화:', SW_VERSION);
  e.waitUntil(self.clients.claim());
});

function getIconUrl(){
  return self.registration.scope + 'icon-192.png';
}

self.addEventListener('message', e => {
  const data = e.data;
  if(!data) return;
  console.log('[SW] 메시지 수신:', data.type);

  if(data.type === 'SCHEDULE_ALARM'){
    const delay = Math.max(Number(data.delay)||0, 100);
    console.log('[SW] 알림 예약:', data.title, Math.round(delay/60000)+'분 후');
    setTimeout(() => {
      self.registration.showNotification(data.title || 'InsurePro', {
        body: data.body || '',
        icon: getIconUrl(),
        badge: getIconUrl(),
        tag: data.id || ('sched-'+Date.now()),
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        silent: false,
        data: { url: data.url || self.registration.scope },
        actions: [
          { action: 'open',    title: '📅 일정 확인' },
          { action: 'dismiss', title: '닫기' }
        ]
      });
    }, delay);
  }

  if(data.type === 'INSTANT_NOTIF'){
    self.registration.showNotification(data.title || 'InsurePro', {
      body: data.body || '',
      icon: getIconUrl(),
      badge: getIconUrl(),
      tag: 'instant-'+Date.now(),
      vibrate: [200, 100, 200],
      silent: false,
      data: { url: data.url || self.registration.scope }
    });
  }

  if(data.type === 'CANCEL_ALARM'){
    self.registration.getNotifications({ tag: data.id }).then(ns => ns.forEach(n=>n.close()));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if(e.action === 'dismiss') return;
  const url = e.notification.data?.url || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(clients => {
      for(const c of clients){
        if(c.url.includes('insurepro') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
