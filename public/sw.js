// Minimal service worker: exists to satisfy PWA installability criteria.
// Deliberately does not cache anything — the dashboard shows live
// autonomous-agent state, so a network-first (effectively network-only)
// strategy is correct here, not a performance optimization to skip.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
