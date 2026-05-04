/**
 * Синхронизация сброса кэшей между вкладками.
 *
 * Использует `BroadcastChannel`, чтобы несколько открытых вкладок приложения
 * одновременно узнавали об инвалидировании локального кэша.
 */
type CacheKey = "feed" | "widgetbar";

const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("arisnet-cache") : null;

/**
 * Рассылает событие инвалидирования кэша.
 *
 * @param {CacheKey} key Ключ кэша.
 * @returns {void}
 */
export function broadcastCacheInvalidation(key: CacheKey): void {
  channel?.postMessage({ key });
}

/**
 * Подписывает обработчик на события инвалидирования кэша.
 *
 * @param {(key: CacheKey) => void} handler Обработчик события.
 * @returns {() => void} Функция отписки.
 */
export function onCacheInvalidation(handler: (key: CacheKey) => void): () => void {
  if (!channel) return () => {};
  const fn = (e: MessageEvent<{ key: CacheKey }>) => handler(e.data.key);
  channel.addEventListener("message", fn);
  return () => channel.removeEventListener("message", fn);
}
