/**
 * SiteSync Cloud Suite — Service Worker
 *
 * Strategy:
 *  - App shell (HTML/JS/CSS assets): Cache-first with network fallback
 *  - API/Supabase requests: Network-first with cache fallback (offline reads)
 *  - Static assets (fonts, images): Cache-first with 30-day expiry
 */

const CACHE_VERSION = "sitesyncos-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_SHELL_URLS = ["/", "/index.html"];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("sitesyncos-") && k !== APP_SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // Supabase API: network-first, cache fallback
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in")) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
    return;
  }

  // App assets (same origin): cache-first with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetwork(request, APP_SHELL_CACHE));
    return;
  }
});

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

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
    // Return cached index.html for SPA navigation
    const fallback = await caches.match("/index.html");
    return fallback ?? new Response("Offline", { status: 503 });
  }
}
