/**
 * SiteSync Cloud Suite — Service Worker v2
 *
 * Strategy:
 *  - /assets/* (Vite content-hashed chunks): Cache-first, immutable — never re-fetch
 *  - HTML navigation (same-origin, no extension): Network-first with cache fallback
 *  - Supabase API requests: Network-first with cache fallback (offline reads)
 *  - Other same-origin requests: Cache-first with network fallback
 *
 * Version bump (v1 → v2): old caches are deleted on activate.
 */

const CACHE_VERSION = "sitesyncos-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE     = `${CACHE_VERSION}-data`;

// Pre-cache the minimum shell needed to bootstrap the SPA
const APP_SHELL_URLS = ["/", "/index.html"];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  // Activate immediately — don't wait for old SW to stop controlling clients
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // Delete any cache that belongs to this app but is from an old version
          .filter((k) => k.startsWith("sitesyncos-") && k !== APP_SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET; skip dev-tool and extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // ── Vite content-hashed chunks (/assets/*.js, /assets/*.css) ──────────────
  // These filenames contain a content hash so they are immutable: serve from
  // cache immediately, populate on first miss. Never need to revalidate.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstImmutable(request, APP_SHELL_CACHE));
    return;
  }

  // ── Supabase API (realtime data) ───────────────────────────────────────────
  // Network-first: always try to fetch fresh data; fall back to stale cache
  // when offline so the app can still render without crashing.
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in")) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
    return;
  }

  // ── Same-origin HTML navigation (SPA routes) ──────────────────────────────
  // Network-first so we always get the latest index.html on deploy.
  // Falls back to cached index.html when offline.
  if (url.origin === self.location.origin && request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithCache(request, APP_SHELL_CACHE));
    return;
  }

  // ── All other same-origin requests (fonts, public images, etc.) ───────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetwork(request, APP_SHELL_CACHE));
    return;
  }
});

// ─── Strategy helpers ─────────────────────────────────────────────────────────

/** Cache-first, no expiry — for Vite hashed assets that never change. */
async function cacheFirstImmutable(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/** Network-first — try network, fall back to cached response when offline. */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // SPA fallback: any navigation miss returns index.html so React Router handles it
    const fallback = await caches.match("/index.html");
    return fallback ?? new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Cache-first with network fallback — for other same-origin static files. */
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await caches.match("/index.html");
    return fallback ?? new Response("Offline", { status: 503 });
  }
}
