/* sw.js — Gym Dashboard (reliable "Reload to update" flow)
   - Caches app shell (index.html)
   - Updates shell in background
   - Exposes SKIP_WAITING so UI can force-apply an update
*/

const CACHE_NAME = "gymdash-shell-v1";
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

  // Navigation requests get the app shell (cached fast, refreshed in background)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("./index.html");

        const freshPromise = fetch("./index.html", { cache: "no-store" })
          .then((res) => {
            if (res.ok) cache.put("./index.html", res.clone());
            return res;
          })
          .catch(() => null);

        return cached || (await freshPromise) || cached;
      })()
    );
  }
});
