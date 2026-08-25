const CACHE_NAME = 'tech-kevin-cache-v3';
const ASSETS_TO_CACHE = [
  './', './index.html', './style.css', './app.js', 
  './database.js', './ai-search.js', './pdf-generator.js', './manifest.json'
];

// Installation : Mise en cache des assets critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Active immédiatement le nouveau SW
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Prend le contrôle immédiatement
});

// Fetch : Stratégie Network First (Actualisation à chaque lancement si 4G/5G/Wifi dispo)
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes POST ou non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si succès réseau, on met à jour le cache en arrière-plan
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si hors-ligne, on sert depuis le cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response("Hors ligne - Ressource non cachée", { status: 503 });
        });
      })
  );
});
