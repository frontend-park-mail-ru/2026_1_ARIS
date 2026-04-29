/**
 * Persistent-кэш страницы ленты.
 */
import type { PostcardModel } from "../../api/feed";
import type { FeedAuthKey, FeedMode } from "./types";
import { feedItemsCache, setActiveFeedState } from "./state";
import { broadcastCacheInvalidation } from "../../utils/cache-channel";

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

type PersistedFeed = { items: PostcardModel[]; cachedAt: number };

export function getFeedItemsStorageKey(authKey: FeedAuthKey, modeKey: FeedMode): string {
  return `arisfront:feed-items:${authKey}:${modeKey}`;
}

/** Читает сохранённые элементы ленты из sessionStorage, проверяя TTL. */
export function readPersistedFeedItems(
  authKey: FeedAuthKey,
  modeKey: FeedMode,
): PostcardModel[] | null {
  try {
    const raw = sessionStorage.getItem(getFeedItemsStorageKey(authKey, modeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFeed | PostcardModel[];

    // Поддержка старого формата (массив без cachedAt)
    if (Array.isArray(parsed)) return parsed;

    if (Date.now() - parsed.cachedAt > FEED_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

/** Сохраняет элементы ленты в sessionStorage с меткой времени. */
export function persistFeedItems(
  authKey: FeedAuthKey,
  modeKey: FeedMode,
  items: PostcardModel[],
): void {
  try {
    const payload: PersistedFeed = { items, cachedAt: Date.now() };
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
