
const CACHE = "night-run-v6";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle this website's own files.
  if (url.origin !== self.location.origin) return;

  // Always check the network first for HTML pages.
  if (request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith("/")) {

    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(hit =>
            hit || caches.match("./index.html")
          )
        )
    );

    return;
  }

  // Cache other local files when available.
  event.respondWith(
    caches.match(request).then(hit =>
      hit || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache =>
            cache.put(request, copy)
          );
        }
        return response;
      })
    )
  );
});
