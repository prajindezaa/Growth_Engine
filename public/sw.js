// Service worker self-destruct to clear corrupt caches and unregister
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Network-only fallback without caching to avoid ERR_FAILED
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

