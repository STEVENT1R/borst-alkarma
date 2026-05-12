// This is the "Offline page" service worker with Push Notification support
// Combined for PWABuilder APK generation and push notifications

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "borst-alkarma-cache-v1";

// الصفحة اللي هتظهر لما يكون offline (الصفحة الرئيسية للتطبيق)
const offlineFallbackPage = "index.html";

// ---- PWABuilder / Offline Caching ----

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  // حذف الكاش القديم لو فيه
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => clients.claim())
  );
});

if (workbox && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  // لو الطلب هو صفحة (navigate)، جرب تجيبها من النت، ولو فشلت استخدم الكاش
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;

        if (preloadResp) {
          return preloadResp;
        }

        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        console.log('[SW] Network failed, serving cached fallback');
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp || new Response('Offline', { status: 503 });
      }
    })());
  }
  // للطلبات التانية (assets, images, etc.) - استراتيجية Network First
  else {
    // بس خزن الـ GET requests (مش POST عشان الـ Service Worker ميكراش)
    if (event.request.method !== 'GET') {
      // مرر الطلب منغير تخزين
      event.respondWith(fetch(event.request).catch(() => new Response('Error', { status: 503 })));
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // خزن النسخة في الكاش للاستخدام المستقبلي
          const responseClone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          return cachedResponse || new Response('Offline', { status: 503 });
        })
    );
  }

});

// ---- Push Notification Handlers ----

self.addEventListener('push', (event) => {
  let data = { title: 'بورصة الكرمه', body: 'إشعار جديد' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    tag: 'borst-alkarma',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // لو في تبويب مفتوح، افتحه عنده
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // لو مفيش، افتح تبويب جديد
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
