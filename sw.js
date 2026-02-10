/* ===========================
   Gym Dashboard Service Worker
   - App shell caching for offline reliability
   - Keeps version.json network-first (no-store)
=========================== */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `gymdash-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gymdash-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/styles.css",
  "./assets/js/storage.js",
  "./assets/js/dom.js",
  "./assets/js/utils.js",
  "./assets/js/app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: "reload" })));
      } catch (e) {
        // Fail-open: don't block install if any single file fails
        console.warn("SW install cache failed:", e);
      } finally {
        self.skipWaiting();
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (![SHELL_CACHE, RUNTIME_CACHE].includes(k)) return caches.delete(k);
        })
      );
      self.clients.claim();
    })()
  );
});

function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Keep update checks accurate
  if (url.origin === self.location.origin && url.pathname.endsWith("/version.json")) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req, { cache: "no-store" });
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const hit = await cache.match(req, { ignoreSearch: true });
          return hit || new Response("{}", { headers: { "Content-Type": "application/json" } });
        }
      })()
    );
    return;
  }

  // Navigation: network-first, fallback to cached index.html
  if (url.origin === self.location.origin && isNavigationRequest(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match("./index.html", { ignoreSearch: true });
        try {
          const fresh = await fetch(req);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch {
          return cached || fetch(req);
        }
      })()
    );
    return;
  }

  // Same-origin static: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });

        const fetchPromise = (async () => {
          try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) cache.put(req, fresh.clone());
            return fresh;
          } catch {
            return null;
          }
        })();

        return cached || (await fetchPromise) || fetch(req);
      })()
    );
    return;
  }

  // Cross-origin (Chart.js CDN): cache-first runtime
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || fetch(req);
      }
    })()
  );
});
/* ---------------------------
   Allow page to trigger update
---------------------------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
