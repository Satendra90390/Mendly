const CACHE_NAME = "mendly-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./auth.js",
  "./app.js",
  "./update.js",
  "./manifest.json",
  "./logo.svg",
  "./logo-192.png",
  "./logo-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
  );
});
