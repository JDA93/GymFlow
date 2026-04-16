const CACHE_NAME = "gymflow-pro-cache-v9-offline-robust";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./analytics-core.js",
  "./catalog.js",
  "./session.js",
  "./store.js",
  "./pwa.js",
  "./ui-common.js",
  "./ui-dashboard.js",
  "./ui-meta.js",
  "./ui-records.js",
  "./ui-session.js",
  "./utils.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const OFFLINE_FALLBACK_URL = "./index.html";

function canCacheResponse(response) {
  if (!response) return false;
  if (!response.ok) return false;
  if (response.status === 206) return false;
  return response.type === "basic" || response.type === "cors";
}

async function safePrecache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    CORE_ASSETS.map(async (assetUrl) => {
      try {
        const response = await fetch(assetUrl, { cache: "no-cache" });
        if (!canCacheResponse(response)) return;
        await cache.put(assetUrl, response.clone());
      } catch (error) {
        // Instalación defensiva: un fallo puntual no debería romper todo el SW.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(safePrecache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (canCacheResponse(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_FALLBACK_URL, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_FALLBACK_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (canCacheResponse(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
      if (cached) {
        event.waitUntil(networkFetch.catch(() => {}));
        return cached;
      }
      return networkFetch.catch(() => cached);
    })
  );
});
