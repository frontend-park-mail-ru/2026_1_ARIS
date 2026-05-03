/**
 * Рендер страницы ленты.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import { renderPostcard } from "../../components/postcard/postcard";
import { getFeedMode } from "../../state/session";
import type { PostcardModel } from "../../api/feed";

type RenderFeedCardsOptions = {
  /** Нужно ли дать первой карточке приоритетную загрузку медиа. */
  prioritizeFirstCardMedia?: boolean;
};

function renderFeedModeMobileSwitcher(): string {
  const activeMode = getFeedMode();

  return `
    <section class="feed-mode-mobile content-card" aria-label="Тип ленты">
      <button
        type="button"
        class="feed-mode-mobile__button${activeMode === "for-you" ? " feed-mode-mobile__button--active" : ""}"
        data-feed-mode="for-you"
      >
        Для вас
      </button>
      <button
        type="button"
        class="feed-mode-mobile__button${activeMode !== "for-you" ? " feed-mode-mobile__button--active" : ""}"
        data-feed-mode="by-time"
      >
        По времени
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
        <h2 class="feed-empty-state__title">Список пуст.</h2>
        <p class="feed-empty-state__text">
          Как только друзья начнут публиковать новые записи, они появятся здесь.
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
        <h2 class="feed-empty-state__title">Список пуст.</h2>
        <p class="feed-empty-state__text">
          Как только в сети появятся новые посты, они сразу отобразятся здесь.
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
        <h2 class="feed-empty-state__title">Лента временно недоступна</h2>
        <p class="feed-empty-state__text">
          ${isAuthorised ? "Нет соединения с интернетом." : "Не удалось загрузить публичную ленту."}
          Покажем свежие посты, когда соединение вернётся.
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
  const text = isLoading
    ? "Загружаем ещё публикации..."
    : "Прокрутите ниже, чтобы увидеть ещё публикации.";

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
