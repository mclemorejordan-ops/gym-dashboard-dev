/* sw.js — Gym Dashboard (reliable "Reload to update" flow)
   - Network-first for index.html so users always get the newest UI when online
   - Cache fallback for offline
   - Exposes SKIP_WAITING so UI can force-apply an update
   - ✅ Cache name is versioned via the SW script URL query param (?v=...)
*/

// Version comes from the registered SW URL (e.g. ./sw.js?v=1.2.3)
const __swUrl = new URL(self.location.href);
const __swVersion = (__swUrl.searchParams.get("v") || "v1").trim() || "v1";

const CACHE_NAME = `gymdash-shell-${__swVersion}`;
const APP_SHELL = ["./", "./index.html"];

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

  if (url.origin !== self.location.origin) return;

  // Always fetch version.json fresh (we don't want it cached here)
  if (url.pathname.endsWith("/version.json")) {
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
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      })()
    );
    return;
  }
});
