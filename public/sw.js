const CACHE_VERSION = "aris-v1";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const API_CACHE = `${CACHE_VERSION}:api`;

function withSourceHeader(response, source) {
  const headers = new Headers(response.headers);
  headers.set("x-aris-response-source", source);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readPrecacheUrls() {
  try {
    const response = await fetch("/asset-manifest.json", { cache: "no-store" });

    if (!response.ok) {
      return ["/", "/index.html"];
    }

    const data = await response.json();
    return Array.isArray(data.assets) ? data.assets : ["/", "/index.html"];
  } catch {
    return ["/", "/index.html"];
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const urls = await readPrecacheUrls();
      await cache.addAll(urls);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }

      return withSourceHeader(response, "network");
    })
    .catch(() => (cached ? withSourceHeader(cached, "cache") : cached));

  return cached ? withSourceHeader(cached, "cache") : networkPromise;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return withSourceHeader(response, "network");
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return withSourceHeader(cachedResponse, "cache");
    }

    if (fallbackUrl) {
      const fallbackResponse = await caches.match(fallbackUrl);

      if (fallbackResponse) {
        return withSourceHeader(fallbackResponse, "cache");
      }
    }

    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, STATIC_CACHE, "/index.html"));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.searchParams.has("healthcheck")) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/image-proxy")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});
