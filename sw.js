/* ===========================
   Gym Dashboard Service Worker
   - App shell caching for offline reliability
   - version.json: network-first (no-store) + cache latest for offline
   - Supports clean updates via SKIP_WAITING message
=========================== */

const CACHE_VERSION = "v2";
const SHELL_CACHE = `gymdash-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gymdash-runtime-${CACHE_VERSION}`;

// App shell (same-origin). Cached so the app loads offline.
// NOTE: We match ignoring query strings (?v=6) in fetch via ignoreSearch.
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
        // ✅ Do NOT auto-activate.
        // Let the new SW reach "waiting" so the app can show an update banner
        // and only activate when the user chooses (via SKIP_WAITING message).
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

// ✅ Single message handler (removed duplicate)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "PING") {
    event.source?.postMessage?.("PONG");
  }
});

// Helper: decide if request is navigation
function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

// Fetch strategies:
// - version.json: network-first (no-store), cache latest successful result in RUNTIME_CACHE
// - navigation: network-first with cache fallback to index.html
// - same-origin static: stale-while-revalidate (in SHELL_CACHE)
// - cross-origin (Chart.js CDN): cache-first (in RUNTIME_CACHE)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // version.json: never serve stale when online; keep latest for offline
  if (url.origin === self.location.origin && url.pathname.endsWith("/version.json")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);

        try {
          const fresh = await fetch(req, { cache: "no-store" });

          // Cache latest known-good version.json for offline
          if (fresh && fresh.ok) {
            await cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const hit = await cache.match(req, { ignoreSearch: true });
          return (
            hit ||
            new Response("{}", {
              headers: { "Content-Type": "application/json" }
            })
          );
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
        const cachedIndex = await cache.match("./index.html", { ignoreSearch: true });

        try {
          const fresh = await fetch(req);
          // Keep index.html fresh in cache
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch {
          return cachedIndex || fetch(req);
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
            if (fresh && fresh.ok) await cache.put(req, fresh.clone());
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

  // Cross-origin runtime: cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || fetch(req);
      }
    })()
  );
});
