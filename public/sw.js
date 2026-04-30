const CACHE_VERSION = "aris-v4";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const API_CACHE = `${CACHE_VERSION}:api`;
const OUTBOX_DB_NAME = "aris-outbox";
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = "requests";
const OUTBOX_SYNC_TAG = "aris-outbox";
const STATIC_FALLBACK_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/assets/img/logo-v3.png",
  "/assets/img/apple-touch-icon.png",
  "/assets/img/pwa-192.png",
  "/assets/img/pwa-512.png",
];

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

function getPrecacheUrls(urls) {
  return Array.from(new Set([...(Array.isArray(urls) ? urls : []), ...STATIC_FALLBACK_URLS]));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const urls = getPrecacheUrls(await readPrecacheUrls());
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
    .catch(() => {
      if (cached) {
        return withSourceHeader(cached, "cache");
      }

      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-aris-response-source": "offline",
        },
      });
    });

  return cached ? withSourceHeader(cached, "cache") : networkPromise;
}

const API_CACHE_TTL = {
  default: 5 * 60 * 1000,
  feed: 5 * 60 * 1000,
  popular: 10 * 60 * 1000,
  auth: 0,
};

function getApiTtl(pathname) {
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/user/current")) {
    return API_CACHE_TTL.auth;
  }
  if (
    pathname.startsWith("/api/users/popular") ||
    pathname.startsWith("/api/posts/popular") ||
    pathname.startsWith("/api/users/suggested")
  ) {
    return API_CACHE_TTL.popular;
  }
  return API_CACHE_TTL.default;
}

function openOutboxDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("failed to open outbox db"));
  });
}

async function readOutboxRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readonly");
    const store = transaction.objectStore(OUTBOX_STORE);
    const index = store.index("createdAt");
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("failed to read outbox"));
  });
}

async function deleteOutboxRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    transaction.objectStore(OUTBOX_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("failed to delete outbox item"));
  });
}

async function updateOutboxRequest(db, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    transaction.objectStore(OUTBOX_STORE).put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("failed to update outbox item"));
  });
}

async function notifyOutboxDrained(count) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage({
      type: "ARIS_OUTBOX_DRAINED",
      count,
    });
  });
}

async function drainOutbox() {
  const db = await openOutboxDb();

  try {
    const items = await readOutboxRequests(db);

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          credentials: "include",
          headers: item.headers || {},
          body: item.body,
        });

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            await deleteOutboxRequest(db, item.id);
            continue;
          }

          throw new Error(`outbox request failed with status ${response.status}`);
        }

        await deleteOutboxRequest(db, item.id);
      } catch (error) {
        await updateOutboxRequest(db, {
          ...item,
          attempts: Number(item.attempts || 0) + 1,
          lastError: error instanceof Error ? error.message : "outbox request failed",
        });
        throw error;
      }
    }

    if (items.length > 0) {
      await notifyOutboxDrained(items.length);
    }
  } finally {
    db.close();
  }
}

async function networkFirst(request, cacheName, fallbackUrls) {
  const cache = await caches.open(cacheName);
  const url = new URL(request.url);
  const ttl = getApiTtl(url.pathname);

  try {
    const response = await fetch(request);

    if (response.ok) {
      // Сохраняем ответ с меткой времени для проверки TTL
      const headers = new Headers(response.headers);
      headers.set("x-aris-cached-at", String(Date.now()));
      const stamped = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, stamped);
    }

    return withSourceHeader(response, "network");
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Проверяем TTL — для auth-эндпоинтов кэш не используется
      if (ttl > 0) {
        const cachedAt = Number(cachedResponse.headers.get("x-aris-cached-at") ?? 0);
        if (Date.now() - cachedAt <= ttl) {
          return withSourceHeader(cachedResponse, "cache");
        }
      }
    }

    const fallbacks = Array.isArray(fallbackUrls)
      ? fallbackUrls
      : fallbackUrls
        ? [fallbackUrls]
        : [];

    for (const fallbackUrl of fallbacks) {
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
    event.respondWith(networkFirst(request, STATIC_CACHE, ["/index.html", "/offline.html"]));
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

self.addEventListener("sync", (event) => {
  if (event.tag !== OUTBOX_SYNC_TAG) {
    return;
  }

  event.waitUntil(drainOutbox());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "ARIS_DRAIN_OUTBOX") {
    return;
  }

  event.waitUntil(drainOutbox());
});
