/**
 * Рендер страницы ленты.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import { renderPostcard } from "../../components/postcard/postcard";
import { getFeedMode } from "../../state/session";
import { t } from "../../state/i18n";
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
        <h2 class="feed-empty-state__title">${t("common.emptyList")}</h2>
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
        <h2 class="feed-empty-state__title">${t("common.emptyList")}</h2>
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
export function renderFeedCards(
  items: PostcardModel[],
  options: RenderFeedCardsOptions = {},
): string {
  return items
    .map((item, index) =>
      renderPostcard(item, {
        prioritizeMedia: Boolean(options.prioritizeFirstCardMedia) && index === 0,
      }),
    )
    .join("");
}

/**
 * Рендерит центральную колонку ленты с первой порцией карточек.
 *
 * @param {PostcardModel[]} items Полный набор карточек.
 * @param {number} renderedCount Количество карточек, видимых сразу.
 * @returns {string} HTML центральной колонки.
 */
export function renderIncrementalFeedCenter(items: PostcardModel[], renderedCount: number): string {
  const visibleItems = items.slice(0, renderedCount);

  return `
    <section class="app-layout__center" data-feed-center>
      ${renderFeedModeMobileSwitcher()}
      <div class="feed-stream" data-feed-list>
        ${renderFeedCards(visibleItems, { prioritizeFirstCardMedia: true })}
      </div>
      ${renderFeedStatus(renderedCount < items.length, false)}
    </section>
  `;
}
