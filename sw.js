// ============================================================
//  AICHA LOGISTIQUE — Service Worker v5
// ============================================================

const CACHE_NAME = 'aicha-v5';
const ASSETS = [
  '/',
  './index.html',
  '/css/app.css',
  '/js/supabase.js',
  '/js/offline-queue.js',
  '/js/notifications.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Ne jamais intercepter les requêtes externes
  if (
    url.includes('supabase.co') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    !url.startsWith(self.location.origin)
  ) {
    return; // Pass-through complet
  }

  // Assets locaux : cache d'abord
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); }
  catch { payload = { title: 'Aicha Logistique', body: e.data.text(), data: {} }; }

  const options = {
    body:    payload.body || '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    data:    payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: getActions(payload.data?.type),
  };

  e.waitUntil(
    self.registration.showNotification(payload.title || 'Aicha Logistique', options)
  );
});

function getActions(type) {
  switch (type) {
    case 'nouvelle_course':
    case 'nouvelle_depense':
      return [{ action: 'voir', title: '👁️ Voir' }];
    case 'demande_modif':
      return [{ action: 'approuver', title: '✅ Approuver' }, { action: 'voir', title: '👁️ Voir' }];
    case 'demande_approuvee':
      return [{ action: 'modifier', title: '✏️ Modifier maintenant' }];
    default:
      return [{ action: 'voir', title: '👁️ Voir' }];
  }
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const url  = data.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIF_CLICK', action: e.action, data });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
