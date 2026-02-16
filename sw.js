/* sw.js — Gym Dashboard (reliable "Reload to update" flow)
   - Network-first for index.html so users always get the newest UI when online
   - Cache fallback for offline
   - Exposes SKIP_WAITING so UI can force-apply an update
*/

const CACHE_NAME = "gymdash-shell-v2";
const EXT_CACHE = "gymdash-ext-v1";

// App shell (always available offline)
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      // Do not auto-activate; we want controlled "Reload to update"
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("gymdash-shell-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always fetch version.json fresh (we don't want it cached here)
  if (url.origin === self.location.origin && url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // ✅ NETWORK-FIRST for navigation so the newest index.html is used immediately
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // Try fresh first
        try {
          const fresh = await fetch("./index.html", { cache: "no-store" });
          if (fresh && fresh.ok) {
            await cache.put("./index.html", fresh.clone());
            return fresh;
          }
        } catch (e) {
          // ignore; fall back to cache
        }

        // Offline / fetch failed → cached shell
        const cached = await cache.match("./index.html");
        if (cached) return cached;

        // Absolute last resort (should be rare)
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      })()
    );
    return;
  }

  // ✅ SAME-ORIGIN: serve cached shell assets when possible
  if (url.origin === self.location.origin) {
    // Serve shell assets cache-first
    if (APP_SHELL.includes(url.pathname === "/" ? "./" : `.${url.pathname}`)) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const match = await cache.match(req);
          if (match) return match;
          const fresh = await fetch(req);
          if (fresh && fresh.ok) await cache.put(req, fresh.clone());
          return fresh;
        })()
      );
      return;
    }
    return; // allow default browser fetch for other same-origin requests
  }

  // ✅ CROSS-ORIGIN: runtime-cache Chart.js so Progress charts still work offline
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/chart.js@4.4.3/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(EXT_CACHE);
        const cached = await cache.match(req);

        // Stale-while-revalidate:
        // - return cached immediately if present
        // - update cache in the background
        const fetchPromise = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);

        if (cached) return cached;

        const fresh = await fetchPromise;
        if (fresh) return fresh;

        return new Response("", { status: 504 });
      })()
    );
    return;
  }
});

