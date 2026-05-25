/**
 * Рендер страницы ленты.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import { renderPostcard } from "../../components/postcard/postcard";
import { getFeedMode, getSessionUser } from "../../state/session";
import { escapeHtml, renderAvatarMarkup } from "../../utils/avatar";
import { t } from "../../state/i18n";
import { formatPersonName } from "../../utils/display-name";
import type { PostcardModel } from "../../api/feed";

type RenderFeedCardsOptions = {
  /** Нужно ли дать первой карточке приоритетную загрузку медиа. */
  prioritizeFirstCardMedia?: boolean;
};

function renderFeedModeMobileSwitcher(): string {
  const activeMode = getFeedMode();

  return `
    <section class="feed-mode-mobile content-card" aria-label="${t("sidebar.feedType")}">
      <button
        type="button"
        class="feed-mode-mobile__button${activeMode === "for-you" ? " feed-mode-mobile__button--active" : ""}"
        data-feed-mode="for-you"
      >
        ${t("sidebar.forYou")}
      </button>
      <button
        type="button"
        class="feed-mode-mobile__button${activeMode !== "for-you" ? " feed-mode-mobile__button--active" : ""}"
        data-feed-mode="by-time"
      >
        ${t("sidebar.byTime")}
      </button>
    </section>
  `;
}

/**
 * Рендерит пустое состояние, когда у пользователя нет постов друзей.
 *
 * @returns {string} HTML центральной колонки.
 */
export function renderEmptyFriendsFeed(): string {
  return `
    <section class="app-layout__center">
      ${renderFeedModeMobileSwitcher()}
      <section class="feed-empty-state content-card">
        <h2 class="feed-empty-state__title">${t("feed.emptyTitle")}</h2>
        <p class="feed-empty-state__text">
          ${t("feed.emptyFriendsDescription")}
        </p>
      </section>
    </section>
  `;
}

/**
 * Рендерит пустое состояние публичной ленты.
 *
 * @returns {string} HTML центральной колонки.
 */
export function renderEmptyPublicFeed(): string {
  return `
    <section class="app-layout__center">
      ${renderFeedModeMobileSwitcher()}
      <section class="feed-empty-state content-card">
        <h2 class="feed-empty-state__title">${t("feed.emptyTitle")}</h2>
        <p class="feed-empty-state__text">
          ${t("feed.emptyPublicDescription")}
        </p>
      </section>
    </section>
  `;
}

/**
 * Рендерит резервное состояние ленты для офлайн-сценария.
 *
 * @param {boolean} isAuthorised Открыта ли лента авторизованным пользователем.
 * @returns {string} HTML центральной колонки.
 */
export function renderOfflineFeedFallback(isAuthorised: boolean): string {
  return `
    <section class="app-layout__center">
      ${renderFeedModeMobileSwitcher()}
      <section class="feed-empty-state content-card">
        <h2 class="feed-empty-state__title">${t("feed.unavailable")}</h2>
        <p class="feed-empty-state__text">
          ${isAuthorised ? t("feed.noInternet") : t("feed.publicLoadError")}
          ${t("feed.offlineDescription")}
        </p>
      </section>
    </section>
  `;
}

/**
 * Рендерит индикатор бесконечной прокрутки.
 *
 * @param {boolean} hasMore Есть ли ещё элементы в ленте.
 * @param {boolean} isLoading Идёт ли сейчас дозагрузка.
 * @returns {string} HTML индикатора.
 */
export function renderFeedStatus(hasMore: boolean, isLoading: boolean): string {
  const hiddenClass = hasMore ? "" : " feed-infinite-status--hidden";
  const text = isLoading ? t("feed.loadingMore") : t("feed.loadMore");

  return `<div class="feed-infinite-status${hiddenClass}" data-feed-status>${text}</div>`;
}

/**
 * Рендерит набор карточек постов.
 *
 * @param {PostcardModel[]} items Карточки постов.
 * @param {RenderFeedCardsOptions} [options={}] Дополнительные настройки рендера.
 * @returns {string} HTML списка карточек.
 */
function renderFeedPostComments(postId: string): string {
  const sessionUser = getSessionUser();
  const userName = sessionUser
    ? formatPersonName(sessionUser.firstName, sessionUser.lastName) || t("widgetbar.userFallback")
    : "";

  return `
    <div class="profile-post__comments feed-post-comments" data-feed-post-comments="${escapeHtml(postId)}" hidden>
      <div class="profile-post__comment-list" data-feed-comment-list="${escapeHtml(postId)}"></div>
      ${
        sessionUser
          ? `
        <div class="profile-comment-compose">
          ${renderAvatarMarkup(
            "profile-comment-compose__avatar",
            userName,
            sessionUser.avatarLink,
            {
              width: 32,
              height: 32,
            },
          )}
          <form class="profile-post__comment-form" data-feed-comment-form="${escapeHtml(postId)}" novalidate>
            <input
              type="text"
              class="profile-post__comment-input"
              placeholder="${t("profile.commentPlaceholder")}"
              data-feed-comment-input="${escapeHtml(postId)}"
              maxlength="2000"
              autocomplete="off"
            >
            <button type="submit" class="profile-post__comment-send">${t("profile.commentSubmit")}</button>
          </form>
        </div>
        <p class="profile-post__comment-error" data-feed-comment-error="${escapeHtml(postId)}" hidden></p>
      `
          : ""
      }
    </div>
  `;
}

export function renderFeedCards(
  items: PostcardModel[],
  options: RenderFeedCardsOptions = {},
): string {
  return items
    .map((item, index) => {
      const postId = String(item.id ?? "");
      return `
        <div class="feed-post-wrap" data-feed-post-wrap="${escapeHtml(postId)}">
          ${renderPostcard(item, {
            prioritizeMedia: Boolean(options.prioritizeFirstCardMedia) && index === 0,
            afterFooterHtml: postId ? renderFeedPostComments(postId) : "",
          })}
        </div>
      `;
    })
    .join("");
}

/**
 * Рендерит центральную колонку ленты с первой порцией карточек.
 *
 * @param {PostcardModel[]} items Полный набор карточек.
 * @param {number} renderedCount Количество карточек, видимых сразу.
 * @param {boolean} serverHasMore Есть ли ещё страницы на сервере.
 * @returns {string} HTML центральной колонки.
 */
export function renderIncrementalFeedCenter(
  items: PostcardModel[],
  renderedCount: number,
  serverHasMore: boolean,
): string {
  const visibleItems = items.slice(0, renderedCount);
  const hasMore = renderedCount < items.length || serverHasMore;

  return `
    <section class="app-layout__center" data-feed-center>
      ${renderFeedModeMobileSwitcher()}
      <div class="feed-stream" data-feed-list>
        ${renderFeedCards(visibleItems, { prioritizeFirstCardMedia: true })}
      </div>
      ${renderFeedStatus(hasMore, false)}
    </section>
  `;
}
