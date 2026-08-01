/*
 * Evolve / Orbit service worker.
 *
 * - Precaches a small app shell so the app opens offline.
 * - Navigations: network-first, falling back to the cached shell when offline.
 * - Same-origin static assets (icons, /_next/static): cache-first (Next.js
 *   fingerprints these, so a new build ships new filenames automatically).
 * - API calls (/api/*) and cross-origin requests are never cached — always live.
 *
 * Auto-update: on a new deploy the browser fetches this file, installs the new
 * worker, and it WAITS (we intentionally do not skipWaiting on install). The
 * page's PwaRegister sends {type:'SKIP_WAITING'} as soon as the update is
 * detected; the worker activates, takes control, and the client reloads onto
 * the new version — so updates reach every user without a manual reinstall.
 */
const CACHE = "evolve-v2";
const SHELL = ["/", "/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
  // NOTE: no skipWaiting() here — the client decides when to activate the
  // update (see the SKIP_WAITING message below), which lets it reload cleanly.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page asks the freshly-installed worker to take over immediately.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin
  if (url.pathname.startsWith("/api/")) return; // never cache API

  // Navigations: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/offline.html"))),
    );
    return;
  }

  // Static assets: cache-first, then network (and populate the cache).
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          }),
      ),
    );
  }
});
