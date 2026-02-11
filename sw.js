/* ===========================
   Gym Dashboard Service Worker
   - App shell caching for offline reliability
   - Keeps version.json network-first (no-store)
   - Supports clean updates via SKIP_WAITING message
=========================== */

const CACHE_VERSION = "v2";
const SHELL_CACHE = `gymdash-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gymdash-runtime-${CACHE_VERSION}`;

// App shell (same-origin). We cache these so the app loads offline.
// NOTE: We match cached assets ignoring URL query strings (?v=6) in fetch.
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

// Install: pre-cache shell (best effort)
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: "reload" })));
      } catch (e) {
        // Fail-open: SW still installs even if some assets aren't present yet
        console.warn("SW install cache failed:", e);
      } finally {
        self.skipWaiting();
      }
    })()
  );
});

// Activate: clean old caches
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

// ✅ Allow the page to trigger an immediate update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Helper: decide if request is navigation
function isNavigationRequest(req) {
  return (
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html")
  );
}

// Fetch strategies:
// - version.json: network-first no-store (keep update checks accurate)
// - navigation: network-first with cache fallback to index.html
// - same-origin static: stale-while-revalidate
// - cross-origin (Chart.js CDN): cache-first runtime
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // Keep your update banner accurate (don’t serve a cached version.json)
  if (url.origin === self.location.origin && url.pathname.endsWith("/version.json")) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req, { cache: "no-store" });
        } catch {
          // If offline, try cached version.json (if it exists)
          const cache = await caches.open(RUNTIME_CACHE);
          const hit = await cache.match(req, { ignoreSearch: true });
          return hit || new Response("{}", { headers: { "Content-Type": "application/json" } });
        }
      })()
    );
    return;
  }

  // Navigation: serve cached index.html when offline
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

  // Same-origin static assets: stale-while-revalidate
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

        // Serve cached immediately if present, otherwise wait for network
        return cached || (await fetchPromise) || fetch(req);
      })()
    );
    return;
  }

  // Cross-origin runtime (Chart.js CDN etc): cache-first
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
