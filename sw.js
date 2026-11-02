const CACHE_NAME = 'finanzas-pwa-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Pre-cachea el cascarón de la aplicación (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activación: Limpia cachés antiguos y toma control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones: Estrategia Cache-First para el App Shell,
// y Network-Only para llamadas POST o hacia Google Apps Script.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // No interceptar peticiones POST ni llamadas al webhook de Google Apps Script
  if (
    request.method !== 'GET' ||
    request.url.includes('script.google.com') ||
    request.url.includes('googleusercontent.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualización en segundo plano (Stale-While-Revalidate opcional para mantener el caché fresco)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => {
            // Modo offline: silencioso, ya entregamos cachedResponse
          });

        return cachedResponse;
      }

      // Si no está en caché, intenta red y guarda si es del mismo origen
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback a index.html si es navegación
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
