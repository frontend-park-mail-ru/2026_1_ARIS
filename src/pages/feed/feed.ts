import { renderHeader } from "../../components/header/header";
import { initPostcardExpand, renderPostcard } from "../../components/postcard/postcard";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getFeed, getPublicFeed, mapFeedResponse, type PostcardModel } from "../../api/feed";
import { getFriends, type Friend } from "../../api/friends";
import { getFeedMode, getSessionUser } from "../../state/session";

type FeedMode = "by-time" | "for-you";
type FeedAuthKey = "guest" | "authorised";

type FeedItemsCache = Record<FeedAuthKey, Record<FeedMode, PostcardModel[] | null>>;

type FeedCenterResult =
  | {
      kind: "items";
      items: PostcardModel[];
    }
  | {
      kind: "html";
      html: string;
    };

type ActiveFeedState = {
  items: PostcardModel[];
  renderedCount: number;
  isLoadingMore: boolean;
};

const FEED_BATCH_SIZE = 10;
const FEED_SCROLL_THRESHOLD_PX = 280;

/**
 * In-memory feed cache for the current browser page session.
 * It is reset only on full page reload.
 */
const feedItemsCache: FeedItemsCache = {
  guest: {
    "by-time": null,
    "for-you": null,
  },
  authorised: {
    "by-time": null,
    "for-you": null,
  },
};

let activeFeedState: ActiveFeedState | null = null;
let isFeedScrollBound = false;
let feedLoadScheduled = false;

function getFeedItemsStorageKey(authKey: FeedAuthKey, modeKey: FeedMode): string {
  return `arisfront:feed-items:${authKey}:${modeKey}`;
}

function readPersistedFeedItems(authKey: FeedAuthKey, modeKey: FeedMode): PostcardModel[] | null {
  try {
    const raw = sessionStorage.getItem(getFeedItemsStorageKey(authKey, modeKey));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PostcardModel[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistFeedItems(authKey: FeedAuthKey, modeKey: FeedMode, items: PostcardModel[]): void {
  try {
    sessionStorage.setItem(getFeedItemsStorageKey(authKey, modeKey), JSON.stringify(items));
  } catch {
    // Ignore storage errors and keep the feed usable.
  }
}

function isOfflineNetworkError(error: unknown): boolean {
  return !navigator.onLine || error instanceof TypeError;
}

function isFeedEmptyResponseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("no more posts") || message.includes("failed to load feed");
}

function renderOfflineFeedFallback(isAuthorised: boolean): string {
  return `
    <section class="app-layout__center">
      <section class="feed-empty-state">
        <h2 class="feed-empty-state__title">Лента временно недоступна</h2>
        <p class="feed-empty-state__text">
          ${isAuthorised ? "Нет соединения с интернетом." : "Не удалось загрузить публичную ленту."}
          Покажем свежие посты, когда соединение вернётся.
        </p>
      </section>
    </section>
  `;
}

function renderEmptyFriendsFeed(): string {
  return `
    <section class="app-layout__center">
      <section class="feed-empty-state">
        <h2 class="feed-empty-state__title">Постов друзей пока нет</h2>
        <p class="feed-empty-state__text">
          Как только друзья начнут публиковать новые записи, они появятся здесь.
        </p>
      </section>
    </section>
  `;
}

function renderEmptyPublicFeed(): string {
  return `
    <section class="app-layout__center">
      <section class="feed-empty-state">
        <h2 class="feed-empty-state__title">Публикаций пока нет</h2>
        <p class="feed-empty-state__text">
          Как только в сети появятся новые посты, они сразу отобразятся здесь.
        </p>
      </section>
    </section>
  `;
}

/**
 * Checks whether a string is a valid feed mode.
 *
 * @param {string} value
 * @returns {value is FeedMode}
 */
function isFeedMode(value: string): value is FeedMode {
  return value === "by-time" || value === "for-you";
}

/**
 * Returns current feed mode in a narrowed type-safe form.
 *
 * @returns {FeedMode}
 */
function getCurrentFeedMode(): FeedMode {
  const mode = getFeedMode();
  return isFeedMode(mode) ? mode : "by-time";
}

/**
 * Clears feed cache.
 *
 * @returns {void}
 */
export function clearFeedCache(): void {
  feedItemsCache.guest["by-time"] = null;
  feedItemsCache.guest["for-you"] = null;
  feedItemsCache.authorised["by-time"] = null;
  feedItemsCache.authorised["for-you"] = null;
  activeFeedState = null;

  try {
    sessionStorage.removeItem(getFeedItemsStorageKey("guest", "by-time"));
    sessionStorage.removeItem(getFeedItemsStorageKey("guest", "for-you"));
    sessionStorage.removeItem(getFeedItemsStorageKey("authorised", "by-time"));
    sessionStorage.removeItem(getFeedItemsStorageKey("authorised", "for-you"));
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Returns sorted feed items for the current feed mode.
 * "for-you" is shuffled once and then cached.
 *
 * @param {PostcardModel[]} items
 * @returns {PostcardModel[]}
 */
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

  return result.sort((a, b) => {
    const aTime = new Date(a.timeRaw).getTime();
    const bTime = new Date(b.timeRaw).getTime();
    return bTime - aTime;
  });
}

function renderFeedStatus(hasMore: boolean, isLoading: boolean): string {
  const hiddenClass = hasMore ? "" : " feed-infinite-status--hidden";
  const text = isLoading
    ? "Загружаем ещё публикации..."
    : "Прокрутите ниже, чтобы увидеть ещё публикации.";

  return `
    <div class="feed-infinite-status${hiddenClass}" data-feed-status>
      ${text}
    </div>
  `;
}

function renderFeedCards(items: PostcardModel[]): string {
  return items.map(renderPostcard).join("");
}

function renderIncrementalFeedCenter(items: PostcardModel[], renderedCount: number): string {
  const visibleItems = items.slice(0, renderedCount);

  return `
    <section class="app-layout__center" data-feed-center>
      <div class="feed-stream" data-feed-list>
        ${renderFeedCards(visibleItems)}
      </div>
      ${renderFeedStatus(renderedCount < items.length, false)}
    </section>
  `;
}

/**
 * Builds guest feed items.
 *
 * @returns {Promise<PostcardModel[]>}
 */
async function buildGuestFeedItems(): Promise<PostcardModel[]> {
  const response = await getPublicFeed({ limit: 100 });
  const mapped = mapFeedResponse(response);

  return getSortedFeedItems(mapped.items);
}

/**
 * Builds authorised feed items.
 *
 * @returns {Promise<PostcardModel[]>}
 */
async function buildAuthorisedFeedItems(): Promise<PostcardModel[]> {
  const [feedResult, friendsResult] = await Promise.allSettled([
    getFeed({ limit: 100 }),
    getFriends("accepted"),
  ]);

  const friends = friendsResult.status === "fulfilled" ? friendsResult.value : [];

  if (feedResult.status === "rejected") {
    if (isOfflineNetworkError(feedResult.reason)) {
      throw feedResult.reason;
    }

    if (isFeedEmptyResponseError(feedResult.reason)) {
      return [];
    }

    throw feedResult.reason;
  }

  const mapped = mapFeedResponse(feedResult.value);
  const friendIds = new Set(friends.map((friend) => String(friend.profileId)));
  const friendsById = new Map<string, Friend>(
    friends.map((friend) => [String(friend.profileId), friend]),
  );
  const filteredItems = mapped.items
    .filter((item) => friendIds.has(String(item.authorId)))
    .map((item) => {
      const friend = friendsById.get(String(item.authorId));

      if (!friend) {
        return item;
      }

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

/**
 * Returns cached feed data for the current auth state and feed mode.
 * Builds and caches it on first request.
 *
 * @param {boolean} isAuthorised
 * @returns {Promise<FeedCenterResult>}
 */
async function getCachedFeedData(isAuthorised: boolean): Promise<FeedCenterResult> {
  const authKey: FeedAuthKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();

  const cachedItems = feedItemsCache[authKey][modeKey];
  if (cachedItems) {
    return { kind: "items", items: cachedItems };
  }

  const persistedItems = readPersistedFeedItems(authKey, modeKey);

  try {
    const items = isAuthorised ? await buildAuthorisedFeedItems() : await buildGuestFeedItems();
    feedItemsCache[authKey][modeKey] = items;
    persistFeedItems(authKey, modeKey, items);
    return { kind: "items", items };
  } catch (error) {
    if (persistedItems?.length) {
      feedItemsCache[authKey][modeKey] = persistedItems;
      return { kind: "items", items: persistedItems };
    }

    if (!isOfflineNetworkError(error)) {
      throw error;
    }

    return { kind: "html", html: renderOfflineFeedFallback(isAuthorised) };
  }
}

function updateFeedStatusElement(): void {
  const status = document.querySelector("[data-feed-status]");

  if (!(status instanceof HTMLElement) || !activeFeedState) {
    return;
  }

  const hasMore = activeFeedState.renderedCount < activeFeedState.items.length;
  status.classList.toggle("feed-infinite-status--hidden", !hasMore);
  status.textContent = activeFeedState.isLoadingMore
    ? "Загружаем ещё публикации..."
    : "Прокрутите ниже, чтобы увидеть ещё публикации.";
}

function appendMoreFeedCards(): void {
  const list = document.querySelector("[data-feed-list]");

  if (!(list instanceof HTMLElement) || !activeFeedState) {
    return;
  }

  const startIndex = activeFeedState.renderedCount;
  const nextCount = Math.min(
    activeFeedState.renderedCount + FEED_BATCH_SIZE,
    activeFeedState.items.length,
  );

  if (nextCount <= startIndex) {
    return;
  }

  const nextItems = activeFeedState.items.slice(startIndex, nextCount);
  list.insertAdjacentHTML("beforeend", renderFeedCards(nextItems));
  activeFeedState.renderedCount = nextCount;
  initPostcardExpand(list);
  updateFeedStatusElement();
}

function scheduleFeedLoadCheck(): void {
  if (feedLoadScheduled) {
    return;
  }

  feedLoadScheduled = true;

  requestAnimationFrame(() => {
    feedLoadScheduled = false;

    if (!activeFeedState || activeFeedState.isLoadingMore) {
      return;
    }

    if (activeFeedState.renderedCount >= activeFeedState.items.length) {
      updateFeedStatusElement();
      return;
    }

    const distanceToBottom =
      document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

    if (distanceToBottom > FEED_SCROLL_THRESHOLD_PX) {
      updateFeedStatusElement();
      return;
    }

    activeFeedState.isLoadingMore = true;
    updateFeedStatusElement();

    requestAnimationFrame(() => {
      appendMoreFeedCards();

      if (activeFeedState) {
        activeFeedState.isLoadingMore = false;
      }

      updateFeedStatusElement();
      scheduleFeedLoadCheck();
    });
  });
}

function bindFeedInfiniteScroll(): void {
  if (isFeedScrollBound) {
    return;
  }

  window.addEventListener("scroll", scheduleFeedLoadCheck, { passive: true });
  window.addEventListener("resize", scheduleFeedLoadCheck);
  isFeedScrollBound = true;
}

export function initFeedInfiniteScroll(): void {
  const center = document.querySelector("[data-feed-center]");

  if (!(center instanceof HTMLElement) || !activeFeedState) {
    return;
  }

  bindFeedInfiniteScroll();
  initPostcardExpand(center);
  updateFeedStatusElement();
  scheduleFeedLoadCheck();
}

/**
 * Renders the feed page.
 *
 * @returns {Promise<string>}
 */
export async function renderFeed(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;
  const feedResult = await getCachedFeedData(isAuthorised);

  let centerMarkup = "";

  if (feedResult.kind === "html") {
    activeFeedState = null;
    centerMarkup = feedResult.html;
  } else if (!feedResult.items.length) {
    activeFeedState = null;
    centerMarkup = isAuthorised ? renderEmptyFriendsFeed() : renderEmptyPublicFeed();
  } else {
    activeFeedState = {
      items: feedResult.items,
      renderedCount: Math.min(FEED_BATCH_SIZE, feedResult.items.length),
      isLoadingMore: false,
    };
    centerMarkup = renderIncrementalFeedCenter(
      activeFeedState.items,
      activeFeedState.renderedCount,
    );
  }

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
 * Refreshes feed center in place.
 *
 * @returns {Promise<void>}
 */
export async function refreshFeedCenter(): Promise<void> {
  const center = document.querySelector(".app-layout__center");
  if (!(center instanceof HTMLElement)) return;

  const isAuthorised = getSessionUser() !== null;
  const feedResult = await getCachedFeedData(isAuthorised);

  let html = "";

  if (feedResult.kind === "html") {
    activeFeedState = null;
    html = feedResult.html;
  } else if (!feedResult.items.length) {
    activeFeedState = null;
    html = isAuthorised ? renderEmptyFriendsFeed() : renderEmptyPublicFeed();
  } else {
    activeFeedState = {
      items: feedResult.items,
      renderedCount: Math.min(FEED_BATCH_SIZE, feedResult.items.length),
      isLoadingMore: false,
    };
    html = renderIncrementalFeedCenter(activeFeedState.items, activeFeedState.renderedCount);
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const newCenter = template.content.firstElementChild;
  if (!(newCenter instanceof HTMLElement)) return;

  center.replaceWith(newCenter);
  initFeedInfiniteScroll();
}

window.addEventListener("apprender", () => {
  initFeedInfiniteScroll();
});
