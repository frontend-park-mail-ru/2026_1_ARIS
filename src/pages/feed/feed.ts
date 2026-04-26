import { domPatch } from "../../vdom/patch";
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getFeed, getPublicFeed, mapFeedResponse, type PostcardModel } from "../../api/feed";
import { getFriends, type Friend } from "../../api/friends";
import { getFeedMode, getSessionUser } from "../../state/session";

import type { FeedMode, FeedAuthKey, FeedCenterResult, ActiveFeedState } from "./types";
import {
  feedItemsCache,
  setActiveFeedState,
  isFeedRefreshInFlight,
  setIsFeedRefreshInFlight,
} from "./state";
import { readPersistedFeedItems, persistFeedItems } from "./cache";
import {
  renderEmptyFriendsFeed,
  renderEmptyPublicFeed,
  renderOfflineFeedFallback,
  renderIncrementalFeedCenter,
} from "./render";
import { initFeedInfiniteScroll, disconnectFeedObserver } from "./scroll";

export { clearFeedCache, clearFeedCacheLocal } from "./cache";
export { initFeedInfiniteScroll } from "./scroll";

const FEED_BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

function isOfflineNetworkError(error: unknown): boolean {
  return !navigator.onLine || error instanceof TypeError;
}

function isFeedEmptyResponseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("no more posts") || message.includes("failed to load feed");
}

function isFeedMode(value: string): value is FeedMode {
  return value === "by-time" || value === "for-you";
}

function getCurrentFeedMode(): FeedMode {
  const mode = getFeedMode();
  return isFeedMode(mode) ? mode : "by-time";
}

function getSortedFeedItems(items: PostcardModel[]): PostcardModel[] {
  const result = [...items];

  if (getCurrentFeedMode() === "for-you") {
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const current = result[i];
      const random = result[j];
      if (current && random) {
        result[i] = random;
        result[j] = current;
      }
    }
    return result;
  }

  return result.sort((a, b) => new Date(b.timeRaw).getTime() - new Date(a.timeRaw).getTime());
}

// ---------------------------------------------------------------------------
// Загрузка данных
// ---------------------------------------------------------------------------

async function buildGuestFeedItems(): Promise<PostcardModel[]> {
  const response = await getPublicFeed({ limit: 100 });
  return getSortedFeedItems(mapFeedResponse(response).items);
}

async function buildAuthorisedFeedItems(): Promise<PostcardModel[]> {
  const [feedResult, friendsResult] = await Promise.allSettled([
    getFeed({ limit: 100 }),
    getFriends("accepted"),
  ]);

  const friends = friendsResult.status === "fulfilled" ? friendsResult.value : [];

  if (feedResult.status === "rejected") {
    if (isOfflineNetworkError(feedResult.reason)) throw feedResult.reason;
    if (isFeedEmptyResponseError(feedResult.reason)) return [];
    throw feedResult.reason;
  }

  const mapped = mapFeedResponse(feedResult.value);
  const friendIds = new Set(friends.map((f: Friend) => String(f.profileId)));
  const friendsById = new Map<string, Friend>(friends.map((f: Friend) => [String(f.profileId), f]));

  const filteredItems = mapped.items
    .filter((item) => friendIds.has(String(item.authorId)))
    .map((item) => {
      const friend = friendsById.get(String(item.authorId));
      if (!friend) return item;
      return {
        ...item,
        firstName: friend.firstName || item.firstName,
        lastName: friend.lastName || item.lastName,
        author: friend.username || item.author,
        avatar: friend.avatarLink || item.avatar,
      };
    });

  return getSortedFeedItems(filteredItems);
}

async function getCachedFeedData(isAuthorised: boolean): Promise<FeedCenterResult> {
  const authKey: FeedAuthKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();
  const cacheKey = `${authKey}:${modeKey}`;

  // Если в памяти есть свежие данные (в пределах TTL) — сразу возвращаем без сетевого запроса.
  const cachedItems = feedItemsCache.get(cacheKey);
  if (cachedItems?.length) {
    return { kind: "items", items: cachedItems };
  }

  const persistedItems = readPersistedFeedItems(authKey, modeKey);

  try {
    const items = isAuthorised ? await buildAuthorisedFeedItems() : await buildGuestFeedItems();
    feedItemsCache.set(cacheKey, items);
    persistFeedItems(authKey, modeKey, items);
    return { kind: "items", items };
  } catch (error) {
    if (persistedItems?.length) {
      feedItemsCache.set(cacheKey, persistedItems);
      return { kind: "items", items: persistedItems };
    }
    if (!isOfflineNetworkError(error)) throw error;
    return { kind: "html", html: renderOfflineFeedFallback(isAuthorised) };
  }
}

// ---------------------------------------------------------------------------
// Вспомогательные функции центральной колонки (используются в renderFeed и refreshFeedCenter)
// ---------------------------------------------------------------------------

function buildFeedCenter(feedResult: FeedCenterResult, isAuthorised: boolean): string {
  if (feedResult.kind === "html") {
    disconnectFeedObserver();
    setActiveFeedState(null);
    return feedResult.html;
  }

  if (!feedResult.items.length) {
    disconnectFeedObserver();
    setActiveFeedState(null);
    return isAuthorised ? renderEmptyFriendsFeed() : renderEmptyPublicFeed();
  }

  const nextState: ActiveFeedState = {
    items: feedResult.items,
    renderedCount: Math.min(FEED_BATCH_SIZE, feedResult.items.length),
    isLoadingMore: false,
  };
  setActiveFeedState(nextState);
  return renderIncrementalFeedCenter(nextState.items, nextState.renderedCount);
}

// ---------------------------------------------------------------------------
// Публичный API
// ---------------------------------------------------------------------------

/**
 * Предзагружает данные ленты в кэш. Если кэш актуален — возвращается мгновенно.
 */
export async function prefetchFeed(): Promise<void> {
  const isAuthorised = getSessionUser() !== null;
  const authKey: FeedAuthKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();
  const cacheKey = `${authKey}:${modeKey}`;
  if (feedItemsCache.get(cacheKey)?.length) return;
  await getCachedFeedData(isAuthorised);
}

/**
 * Рендерит HTML страницы ленты.
 *
 * @returns {Promise<string>}
 */
export async function renderFeed(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;
  const feedResult = await getCachedFeedData(isAuthorised);
  const centerMarkup = buildFeedCenter(feedResult, isAuthorised);

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>
        ${centerMarkup}
        <aside class="app-layout__right">
          ${await renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}

/**
 * Обновляет центральную колонку ленты на месте без полного перерендера страницы.
 *
 * @returns {Promise<void>}
 */
export async function refreshFeedCenter(): Promise<void> {
  const center = document.querySelector(".app-layout__center");
  if (!(center instanceof HTMLElement)) return;

  const isAuthorised = getSessionUser() !== null;
  const feedResult = await getCachedFeedData(isAuthorised);
  const html = buildFeedCenter(feedResult, isAuthorised);

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const newCenter = template.content.firstElementChild;
  if (!(newCenter instanceof HTMLElement)) return;

  domPatch(center, newCenter);
  initFeedInfiniteScroll();
}

// ---------------------------------------------------------------------------
// Глобальные слушатели обновления
// ---------------------------------------------------------------------------

function isFeedRouteActive(): boolean {
  const path = window.location.pathname.replace(/\/+$/g, "") || "/";
  return path === "/" || path === "/feed";
}

async function refreshFeedOnReturn(): Promise<void> {
  if (!isFeedRouteActive() || isFeedRefreshInFlight) return;
  setIsFeedRefreshInFlight(true);
  try {
    await refreshFeedCenter();
  } catch (error) {
    console.error("[feed] refresh on return failed", error);
  } finally {
    setIsFeedRefreshInFlight(false);
  }
}

window.addEventListener("apprender", () => {
  initFeedInfiniteScroll();
});

window.addEventListener("focus", () => {
  void refreshFeedOnReturn();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshFeedOnReturn();
});
