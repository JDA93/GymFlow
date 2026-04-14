const CACHE_VERSION = "gymflow-v5-2026-04-14-1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./js/utils.js",
  "./js/catalog.js",
  "./js/store.js",
  "./js/analytics.js",
  "./js/session.js",
  "./js/ui-common.js",
  "./js/ui-dashboard.js",
  "./js/ui-session.js",
  "./js/ui-records.js",
  "./js/ui-meta.js",
  "./js/pwa.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(APP_SHELL.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "no-store" });
        if (response.ok) await cache.put(asset, response);
      } catch (error) {
        console.warn("No se pudo precachear", asset, error);
      }
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const acceptHeader = event.request.headers.get("accept") || "";
  const isDocument = event.request.mode === "navigate" || acceptHeader.includes("text/html");

  if (isDocument) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match("./index.html"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}
