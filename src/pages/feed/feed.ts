/**
 * Страница ленты.
 *
 * Отвечает за:
 * - загрузку публичной и авторизованной ленты
 * - использование памяти и persistent-кэша
 * - построение центральной колонки
 * - мягкое обновление контента без полного rerender страницы
 */
import { domPatch } from "../../vdom/patch";
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getFeed, getPublicFeed, mapFeedResponse, type PostcardModel } from "../../api/feed";
import { likePost, unlikePost } from "../../api/posts";
import { getFriends, type Friend } from "../../api/friends";
import { getFeedMode, getSessionUser } from "../../state/session";
import { prepareAvatarLinks } from "../../utils/avatar";
import { hydrateFriendAvatarLinks } from "../friends/state";

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
let isFeedLikeBound = false;

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

function formatStatCount(count: number): string {
  if (count >= 1000000) {
    return `${Math.floor(count / 1000000)}м`;
  }

  if (count >= 1000) {
    return `${Math.floor(count / 1000)}к`;
  }

  return String(count);
}

function updateActiveFeedPostLikeState(postId: string, likes: number, isLiked: boolean): void {
  if (!activeFeedState) {
    return;
  }

  const nextItems = activeFeedState.items.map((item) =>
    item.id === postId
      ? {
          ...item,
          likes,
          isLiked,
        }
      : item,
  );
  const nextState: ActiveFeedState = {
    ...activeFeedState,
    items: nextItems,
  };
  const authKey: FeedAuthKey = getSessionUser() ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();

  feedItemsCache.set(`${authKey}:${modeKey}`, nextItems);
  persistFeedItems(authKey, modeKey, nextItems);
  setActiveFeedState(nextState);
}

function syncFeedPostLikeUi(postId: string): void {
  if (!activeFeedState) {
    return;
  }

  const post = activeFeedState.items.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  document
    .querySelectorAll<HTMLButtonElement>(
      `[data-feed-list] [data-post-id="${CSS.escape(postId)}"] .postcard__stat-button[data-action="like"]`,
    )
    .forEach((button) => {
      button.classList.toggle("postcard__stat-button--liked", Boolean(post.isLiked));
      button.dataset.liked = String(Boolean(post.isLiked));
      button.setAttribute("aria-pressed", String(Boolean(post.isLiked)));
      button.setAttribute("aria-label", `${formatStatCount(post.likes)} лайков`);
      button.disabled = false;

      const count = button.querySelector<HTMLElement>(".postcard__stat-count");
      if (count) {
        count.textContent = formatStatCount(post.likes);
      }
    });
}

function bindFeedLikeActions(): void {
  if (isFeedLikeBound) {
    return;
  }

  document.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const likeButton = target.closest('.postcard__stat-button[data-action="like"]');
    if (!(likeButton instanceof HTMLButtonElement) || likeButton.disabled) {
      return;
    }

    if (!(likeButton.closest("[data-feed-list]") instanceof HTMLElement)) {
      return;
    }

    const card = likeButton.closest<HTMLElement>("[data-post-id]");
    const postId = card?.dataset.postId ?? "";
    const post = activeFeedState?.items.find((item) => item.id === postId);
    if (!postId || !post) {
      return;
    }

    likeButton.disabled = true;
    void (post.isLiked ? unlikePost(postId) : likePost(postId))
      .then((updatedPost) => {
        updateActiveFeedPostLikeState(
          postId,
          updatedPost.likes ?? 0,
          updatedPost.isLiked ?? !post.isLiked,
        );
        syncFeedPostLikeUi(postId);
      })
      .catch((error: unknown) => {
        console.error("[feed] like toggle failed", error);
        likeButton.disabled = false;
      });
  });

  isFeedLikeBound = true;
}

/**
 * Сортирует элементы ленты в зависимости от выбранного режима.
 *
 * Для режима `for-you` используется перемешивание, чтобы выдача ощущалась
 * менее предсказуемой без отдельного рекомендательного backend-слоя.
 *
 * @param {PostcardModel[]} items Элементы ленты.
 * @returns {PostcardModel[]} Отсортированный массив.
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

  return result.sort((a, b) => new Date(b.timeRaw).getTime() - new Date(a.timeRaw).getTime());
}

/**
 * Загружает публичную ленту для гостевой страницы.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<PostcardModel[]>} Готовые карточки ленты.
 */
async function buildGuestFeedItems(signal?: AbortSignal): Promise<PostcardModel[]> {
  const response = await getPublicFeed({ limit: 100, ...(signal ? { signal } : {}) });
  return getSortedFeedItems(mapFeedResponse(response).items);
}

/**
 * Загружает ленту для авторизованного пользователя.
 *
 * После загрузки feed дополнительно подтягиваются друзья, чтобы в карточках
 * использовать более точные имя и аватар автора, чем в сыром feed-ответе.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<PostcardModel[]>} Готовые карточки ленты.
 */
async function buildAuthorisedFeedItems(signal?: AbortSignal): Promise<PostcardModel[]> {
  const [feedResult, friendsResult] = await Promise.allSettled([
    getFeed({ limit: 100, ...(signal ? { signal } : {}) }),
    getFriends("accepted", signal),
  ]);

  // Пробрасываем AbortError до любой логики кэширования.
  if (
    feedResult.status === "rejected" &&
    feedResult.reason instanceof Error &&
    feedResult.reason.name === "AbortError"
  ) {
    throw feedResult.reason;
  }
  if (
    friendsResult.status === "rejected" &&
    friendsResult.reason instanceof Error &&
    friendsResult.reason.name === "AbortError"
  ) {
    throw friendsResult.reason;
  }

  const friends =
    friendsResult.status === "fulfilled"
      ? await hydrateFriendAvatarLinks(friendsResult.value, signal)
      : [];

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

/**
 * Возвращает данные ленты из памяти, persistent-кэша или сети.
 *
 * @param {boolean} isAuthorised Открыта ли лента авторизованным пользователем.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<FeedCenterResult>} Результат для центральной колонки.
 */
async function getCachedFeedData(
  isAuthorised: boolean,
  signal?: AbortSignal,
): Promise<FeedCenterResult> {
  const authKey: FeedAuthKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();
  const cacheKey = `${authKey}:${modeKey}`;

  // Если в памяти есть свежие данные в пределах TTL, сразу возвращаем их без сетевого запроса.
  const cachedItems = feedItemsCache.get(cacheKey);
  if (cachedItems?.length) {
    return { kind: "items", items: cachedItems };
  }

  const persistedItems = readPersistedFeedItems(authKey, modeKey);

  try {
    const items = isAuthorised
      ? await buildAuthorisedFeedItems(signal)
      : await buildGuestFeedItems(signal);
    feedItemsCache.set(cacheKey, items);
    persistFeedItems(authKey, modeKey, items);
    return { kind: "items", items };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (persistedItems?.length) {
      feedItemsCache.set(cacheKey, persistedItems);
      return { kind: "items", items: persistedItems };
    }
    if (!isOfflineNetworkError(error)) throw error;
    return { kind: "html", html: renderOfflineFeedFallback(isAuthorised) };
  }
}

/**
 * Строит HTML центральной колонки и синхронизирует runtime-состояние ленты.
 *
 * @param {FeedCenterResult} feedResult Данные или готовый HTML.
 * @param {boolean} isAuthorised Открыта ли лента авторизованным пользователем.
 * @returns {string} Разметка центральной колонки.
 */
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

/**
 * Предзагружает данные ленты в кэш. Если кэш актуален — возвращается мгновенно.
 *
 * @returns {Promise<void>}
 *
 * @example
 * await prefetchFeed();
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
 * @param {Record<string, string>} [_params] Параметры маршрута.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<string>} HTML страницы.
 *
 * @example
 * const html = await renderFeed();
 */
export async function renderFeed(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  bindFeedLikeActions();
  const isAuthorised = getSessionUser() !== null;
  const feedResult = await getCachedFeedData(isAuthorised, signal);
  await prepareAvatarLinks([
    getSessionUser()?.avatarLink,
    ...(feedResult.kind === "items" ? feedResult.items.map((item) => item.avatar) : []),
  ]);
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
 *
 * @example
 * await refreshFeedCenter();
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
    console.error("[feed] Не удалось обновить ленту при возврате на вкладку.", error);
  } finally {
    setIsFeedRefreshInFlight(false);
  }
}

window.addEventListener("apprender", () => {
  bindFeedLikeActions();
  initFeedInfiniteScroll();
});

window.addEventListener("focus", () => {
  void refreshFeedOnReturn();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshFeedOnReturn();
});
