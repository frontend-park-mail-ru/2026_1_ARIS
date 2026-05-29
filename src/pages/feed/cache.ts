/**
 * Persistent-кэш страницы ленты.
 */
import type { FeedAuthKey, FeedCachedPage, FeedMode } from "./types";
import { feedItemsCache, setActiveFeedState } from "./state";
import { broadcastCacheInvalidation } from "../../utils/cache-channel";

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

type PersistedFeed = FeedCachedPage & { cachedAt: number };

export function getFeedItemsStorageKey(authKey: FeedAuthKey, modeKey: FeedMode): string {
  return `arisfront:feed-items:${authKey}:${modeKey}`;
}

/** Читает сохранённую страницу ленты из sessionStorage, проверяя TTL. */
export function readPersistedFeedItems(
  authKey: FeedAuthKey,
  modeKey: FeedMode,
): FeedCachedPage | null {
  try {
    const raw = sessionStorage.getItem(getFeedItemsStorageKey(authKey, modeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFeed | unknown[];

    // Старый формат хранил только items без cursor/hasMore. Его нельзя использовать
    // для infinite scroll, иначе лента считает, что страниц больше нет.
    if (Array.isArray(parsed)) return null;

    if (Date.now() - parsed.cachedAt > FEED_CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items,
      nextCursor: typeof parsed.nextCursor === "string" ? parsed.nextCursor : "",
      hasMore: Boolean(parsed.hasMore),
    };
  } catch {
    return null;
  }
}

/** Сохраняет страницу ленты в sessionStorage с меткой времени. */
export function persistFeedItems(
  authKey: FeedAuthKey,
  modeKey: FeedMode,
  page: FeedCachedPage,
): void {
  try {
    const payload: PersistedFeed = { ...page, cachedAt: Date.now() };
    sessionStorage.setItem(getFeedItemsStorageKey(authKey, modeKey), JSON.stringify(payload));
  } catch {
    // Игнорируем ошибки хранилища, чтобы лента оставалась рабочей.
  }
}

/** Очищает кэши ленты только локально (память + sessionStorage), без broadcast. */
export function clearFeedCacheLocal(): void {
  feedItemsCache.clear();
  setActiveFeedState(null);

  try {
    sessionStorage.removeItem(getFeedItemsStorageKey("guest", "by-time"));
    sessionStorage.removeItem(getFeedItemsStorageKey("guest", "for-you"));
    sessionStorage.removeItem(getFeedItemsStorageKey("authorised", "by-time"));
    sessionStorage.removeItem(getFeedItemsStorageKey("authorised", "for-you"));
  } catch {
    // Игнорируем ошибки хранилища.
  }
}

/** Очищает все кэши ленты и уведомляет другие вкладки через BroadcastChannel. */
export function clearFeedCache(): void {
  clearFeedCacheLocal();
  broadcastCacheInvalidation("feed");
}
