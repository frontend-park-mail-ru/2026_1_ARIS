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
import { renderHeader, refreshHeader } from "../../components/header/header";
import { refreshSidebar, renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getFeed, getPublicFeed, mapFeedResponse, type PostcardModel } from "../../api/feed";
import { ApiError } from "../../api/core/client";
import {
  likePost,
  unlikePost,
  getPostComments,
  getPostCommentReplies,
  createPostComment,
  getPostCommentRepliesBatch,
  likePostComment,
  unlikePostComment,
} from "../../api/posts";
import { renderCommentItemHtml, renderSingleCommentHtml } from "../../utils/post-comment-render";
import { getFeedMode, getSessionUser } from "../../state/session";
import { escapeHtml, prepareAvatarLinks } from "../../utils/avatar";
import { openPostImageViewerFromTarget } from "../../utils/image-viewer";
import { t } from "../../state/i18n";

import type { FeedMode, FeedAuthKey, FeedCenterResult, ActiveFeedState } from "./types";
import {
  activeFeedState,
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
let isFeedImageViewerBound = false;
let isFeedCommentBound = false;
const loadedFeedCommentPostIds = new Set<string>();
const loadingFeedCommentPostIds = new Set<string>();
const openFeedCommentPostIds = new Set<string>();
const expandedFeedReplies = new Map<string, Set<string>>();

function isOfflineNetworkError(error: unknown): boolean {
  if (!navigator.onLine || error instanceof TypeError) {
    return true;
  }

  if (error instanceof ApiError && [502, 503, 504].includes(error.status)) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("proxy") || message.includes("failed to fetch");
  }

  return false;
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

function updateActiveFeedPostCommentCount(postId: string, comments: number): void {
  if (!activeFeedState) {
    return;
  }

  const nextItems = activeFeedState.items.map((item) =>
    item.id === postId
      ? {
          ...item,
          comments,
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

function syncFeedPostCommentCountUi(postId: string): void {
  const post = activeFeedState?.items.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  document
    .querySelectorAll<HTMLElement>(
      `[data-feed-list] [data-post-id="${CSS.escape(postId)}"] .postcard__stat-button[data-action="comment"] .postcard__stat-count`,
    )
    .forEach((count) => {
      count.textContent = formatStatCount(post.comments);
    });
}

function isFeedCommentListEmpty(postId: string): boolean {
  const listEl = document.querySelector<HTMLElement>(
    `[data-feed-comment-list="${CSS.escape(postId)}"]`,
  );

  return !listEl || listEl.childElementCount === 0;
}

function findFeedPostCard(target: Element): HTMLElement | null {
  const card = target.closest<HTMLElement>("[data-post-id]");

  return card?.closest("[data-feed-list]") instanceof HTMLElement ? card : null;
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

    const card = findFeedPostCard(likeButton);
    if (!card) {
      return;
    }

    const postId = card?.dataset.postId ?? "";
    const post = activeFeedState?.items.find((item) => item.id === postId);
    if (!postId || !post) {
      return;
    }

    const optimisticLiked = !post.isLiked;
    const optimisticLikes = Math.max(0, post.likes + (optimisticLiked ? 1 : -1));
    likeButton.disabled = true;
    updateActiveFeedPostLikeState(postId, optimisticLikes, optimisticLiked);
    syncFeedPostLikeUi(postId);

    void (post.isLiked ? unlikePost(postId) : likePost(postId))
      .then((updatedPost) => {
        const isLiked = updatedPost.isLiked ?? optimisticLiked;
        const likes = updatedPost.likes ?? optimisticLikes;
        updateActiveFeedPostLikeState(postId, likes, isLiked);
        syncFeedPostLikeUi(postId);
      })
      .catch((error: unknown) => {
        console.error("[feed] like toggle failed", error);
        updateActiveFeedPostLikeState(postId, post.likes, Boolean(post.isLiked));
        syncFeedPostLikeUi(postId);
        likeButton.disabled = false;
      });
  });

  isFeedLikeBound = true;
}

function bindFeedImageViewerActions(): void {
  if (isFeedImageViewerBound) {
    return;
  }

  document.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!(target.closest("[data-feed-list]") instanceof HTMLElement)) {
      return;
    }

    if (openPostImageViewerFromTarget(target)) {
      event.preventDefault();
    }
  });

  isFeedImageViewerBound = true;
}

async function loadFeedComments(postId: string): Promise<void> {
  const listEl = document.querySelector<HTMLElement>(
    `[data-feed-comment-list="${CSS.escape(postId)}"]`,
  );
  if (!listEl) return;
  if (loadingFeedCommentPostIds.has(postId)) return;

  loadingFeedCommentPostIds.add(postId);
  listEl.innerHTML = `<p class="profile-comment-loading">${t("profile.commentLoading")}</p>`;
  try {
    const comments = await getPostComments(postId, { limit: 50 });
    if (!comments.length) {
      listEl.innerHTML = `<p class="profile-comment-empty">${t("profile.commentsEmpty")}</p>`;
      loadedFeedCommentPostIds.add(postId);
      return;
    }
    const parentIds = comments
      .filter((comment) => comment.repliesCount > 0)
      .map((comment) => comment.id);
    const firstReplies =
      parentIds.length > 0 ? await getPostCommentRepliesBatch(postId, parentIds, { limit: 1 }) : {};
    const post = activeFeedState?.items.find((item) => item.id === postId);
    const headerText = t("profile.commentsHeader").replace(
      "{{n}}",
      String(post?.comments ?? comments.length),
    );

    listEl.innerHTML =
      `<p class="profile-comment-header-label">${escapeHtml(headerText)}</p>` +
      comments
        .map((comment) => renderCommentItemHtml(comment, firstReplies[comment.id]?.[0]))
        .join("");

    const expanded = expandedFeedReplies.get(postId);
    if (expanded && expanded.size > 0) {
      for (const commentId of expanded) {
        const repliesContainer = document.querySelector<HTMLElement>(
          `[data-comment-replies="${CSS.escape(commentId)}"]`,
        );
        if (repliesContainer) {
          void getPostCommentReplies(postId, commentId, { limit: 50 }).then((replies) => {
            repliesContainer.innerHTML = replies
              .map((reply) => renderSingleCommentHtml(reply, true))
              .join("");
          });
        }
      }
    }

    loadedFeedCommentPostIds.add(postId);
  } catch {
    listEl.innerHTML = `<p class="profile-comment-empty">${t("profile.commentSendError")}</p>`;
    loadedFeedCommentPostIds.delete(postId);
  } finally {
    loadingFeedCommentPostIds.delete(postId);
  }
}

function restoreOpenFeedComments(): void {
  openFeedCommentPostIds.forEach((postId) => {
    const commentsEl = document.querySelector<HTMLElement>(
      `[data-feed-post-comments="${CSS.escape(postId)}"]`,
    );
    const commentBtn = document.querySelector<HTMLButtonElement>(
      `[data-feed-list] [data-post-id="${CSS.escape(postId)}"] .postcard__stat-button[data-action="comment"]`,
    );

    if (!commentsEl) return;

    commentsEl.hidden = false;
    commentBtn?.setAttribute("aria-pressed", "true");

    if (!loadedFeedCommentPostIds.has(postId) || isFeedCommentListEmpty(postId)) {
      void loadFeedComments(postId);
    }
  });
}

function bindFeedCommentActions(): void {
  if (isFeedCommentBound) return;

  document.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!(target.closest("[data-feed-list]") instanceof HTMLElement)) return;

    const showRepliesBtn = target.closest("[data-show-replies]");
    if (showRepliesBtn instanceof HTMLButtonElement) {
      const commentId = showRepliesBtn.getAttribute("data-show-replies") ?? "";
      const postId = showRepliesBtn.getAttribute("data-show-replies-post") ?? "";
      const repliesContainer = document.querySelector<HTMLElement>(
        `[data-comment-replies="${CSS.escape(commentId)}"]`,
      );
      if (!repliesContainer || !postId || !commentId) return;

      showRepliesBtn.disabled = true;
      void getPostCommentReplies(postId, commentId, { limit: 50 })
        .then((replies) => {
          repliesContainer.innerHTML = replies
            .map((reply) => renderSingleCommentHtml(reply, true))
            .join("");
          if (!expandedFeedReplies.has(postId)) {
            expandedFeedReplies.set(postId, new Set());
          }
          expandedFeedReplies.get(postId)?.add(commentId);
        })
        .catch(() => {
          showRepliesBtn.disabled = false;
        });
      return;
    }

    const commentLikeBtn = target.closest("[data-comment-like]");
    if (commentLikeBtn instanceof HTMLButtonElement) {
      const commentId = commentLikeBtn.getAttribute("data-comment-like") ?? "";
      const postId = commentLikeBtn.getAttribute("data-comment-like-post") ?? "";
      if (!commentId || !postId || commentLikeBtn.disabled) return;

      const isLiked = commentLikeBtn.getAttribute("aria-pressed") === "true";
      commentLikeBtn.disabled = true;
      void (isLiked ? unlikePostComment(postId, commentId) : likePostComment(postId, commentId))
        .then((updated) => {
          const isNowLiked = updated.isLiked;
          commentLikeBtn.setAttribute("aria-pressed", String(isNowLiked));
          commentLikeBtn.classList.toggle("profile-comment__like--liked", isNowLiked);
          const countSpan = commentLikeBtn.querySelector("span:last-child");
          if (
            countSpan &&
            countSpan !== commentLikeBtn.querySelector(".profile-comment__like-icon")
          ) {
            countSpan.textContent = updated.likes > 0 ? String(updated.likes) : "";
          } else if (updated.likes > 0) {
            const span = document.createElement("span");
            span.textContent = String(updated.likes);
            commentLikeBtn.appendChild(span);
          }
        })
        .catch((error: unknown) => {
          console.error("[feed] comment like failed", error);
        })
        .finally(() => {
          commentLikeBtn.disabled = false;
        });
      return;
    }

    const replyButton = target.closest("[data-comment-reply]");
    if (replyButton instanceof HTMLButtonElement) {
      const commentId = replyButton.getAttribute("data-comment-reply") ?? "";
      const postId = replyButton.getAttribute("data-reply-post") ?? "";
      const authorName = replyButton.getAttribute("data-reply-author") ?? "";
      const form = document.querySelector<HTMLFormElement>(
        `[data-feed-comment-form="${CSS.escape(postId)}"]`,
      );
      const input = form?.querySelector<HTMLInputElement>(
        `[data-feed-comment-input="${CSS.escape(postId)}"]`,
      );

      if (form && input && commentId) {
        form.dataset.feedPostReplyTo = commentId;
        input.placeholder = t("profile.commentReplyPlaceholder").replace("{{name}}", authorName);
        input.focus();
      }
      return;
    }

    const commentBtn = target.closest('.postcard__stat-button[data-action="comment"]');
    if (!(commentBtn instanceof HTMLButtonElement)) return;

    const card = findFeedPostCard(commentBtn);
    const postId = card?.dataset.postId ?? "";
    if (!card || !postId) return;

    const commentsEl = card.querySelector<HTMLElement>(
      `[data-feed-post-comments="${CSS.escape(postId)}"]`,
    );
    if (!commentsEl) return;

    const isOpen = !commentsEl.hidden;
    commentsEl.hidden = isOpen;
    commentBtn.setAttribute("aria-pressed", String(!isOpen));

    if (isOpen) {
      openFeedCommentPostIds.delete(postId);
      return;
    }

    openFeedCommentPostIds.add(postId);
    if (!loadedFeedCommentPostIds.has(postId) || isFeedCommentListEmpty(postId)) {
      void loadFeedComments(postId);
    }
  });

  document.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    const postId = target.dataset.feedCommentForm;
    if (!postId) return;

    event.preventDefault();

    const input = target.querySelector<HTMLInputElement>(
      `[data-feed-comment-input="${CSS.escape(postId)}"]`,
    );
    const errorEl = document.querySelector<HTMLElement>(
      `[data-feed-comment-error="${CSS.escape(postId)}"]`,
    );
    const submitBtn = target.querySelector<HTMLButtonElement>('button[type="submit"]');
    const text = input?.value.trim() ?? "";
    if (!text || !input) return;

    if (submitBtn) submitBtn.disabled = true;
    if (errorEl) errorEl.hidden = true;

    const replyToId = target.dataset.feedPostReplyTo?.trim();
    const commentPayload = replyToId ? { text, parentCommentId: Number(replyToId) } : { text };

    void createPostComment(postId, commentPayload)
      .then(() => {
        input.value = "";
        delete target.dataset.feedPostReplyTo;
        input.placeholder = t("profile.commentPlaceholder");
        loadedFeedCommentPostIds.delete(postId);
        void loadFeedComments(postId);

        const currentCount =
          activeFeedState?.items.find((item) => item.id === postId)?.comments ?? 0;
        updateActiveFeedPostCommentCount(postId, currentCount + 1);
        syncFeedPostCommentCountUi(postId);
      })
      .catch((error: unknown) => {
        console.error("[feed] comment submit failed", error);
        if (errorEl) {
          errorEl.textContent = t("profile.commentSendError");
          errorEl.hidden = false;
        }
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  isFeedCommentBound = true;
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
 * Фильтрация по друзьям выполняется на бэкенде; фронт только сортирует
 * результат согласно выбранному режиму.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<PostcardModel[]>} Готовые карточки ленты.
 */
async function buildAuthorisedFeedItems(signal?: AbortSignal): Promise<PostcardModel[]> {
  const mode = getCurrentFeedMode();
  try {
    const response = await getFeed({ limit: 100, mode, ...(signal ? { signal } : {}) });
    return getSortedFeedItems(mapFeedResponse(response).items);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (isFeedEmptyResponseError(error)) return [];
    throw error;
  }
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
  bindFeedImageViewerActions();
  bindFeedCommentActions();
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
        <aside class="app-layout__right app-layout__right--optional">
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
  restoreOpenFeedComments();
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
  bindFeedImageViewerActions();
  bindFeedCommentActions();
  initFeedInfiniteScroll();
  if (isFeedRouteActive()) {
    refreshHeader();
    refreshSidebar();
  }
  restoreOpenFeedComments();
});

window.addEventListener("focus", () => {
  void refreshFeedOnReturn();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshFeedOnReturn();
});
