type CacheKey = "feed" | "widgetbar";

const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("arisnet-cache") : null;

export function broadcastCacheInvalidation(key: CacheKey): void {
  channel?.postMessage({ key });
}

export function onCacheInvalidation(handler: (key: CacheKey) => void): () => void {
  if (!channel) return () => {};
  const fn = (e: MessageEvent<{ key: CacheKey }>) => handler(e.data.key);
  channel.addEventListener("message", fn);
  return () => channel.removeEventListener("message", fn);
}
