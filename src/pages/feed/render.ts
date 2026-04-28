import { renderPostcard } from "../../components/postcard/postcard";
import type { PostcardModel } from "../../api/feed";

/** Рендерит блок пустого состояния, когда у пользователя нет постов друзей. */
export function renderEmptyFriendsFeed(): string {
  return `
    <section class="app-layout__center">
      <section class="feed-empty-state content-card">
        <h2 class="feed-empty-state__title">Постов друзей пока нет</h2>
        <p class="feed-empty-state__text">
          Как только друзья начнут публиковать новые записи, они появятся здесь.
        </p>
      </section>
    </section>
  `;
}

/** Рендерит блок пустого состояния для публичной ленты. */
export function renderEmptyPublicFeed(): string {
  return `
    <section class="app-layout__center">
      <section class="feed-empty-state content-card">
        <h2 class="feed-empty-state__title">Публикаций пока нет</h2>
        <p class="feed-empty-state__text">
          Как только в сети появятся новые посты, они сразу отобразятся здесь.
        </p>
      </section>
    </section>
  `;
}

/** Рендерит резервный блок для офлайн-сценария. */
export function renderOfflineFeedFallback(isAuthorised: boolean): string {
  return `
    <section class="app-layout__center">
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

/** Рендерит индикатор состояния бесконечной прокрутки. */
export function renderFeedStatus(hasMore: boolean, isLoading: boolean): string {
  const hiddenClass = hasMore ? "" : " feed-infinite-status--hidden";
  const text = isLoading
    ? "Загружаем ещё публикации..."
    : "Прокрутите ниже, чтобы увидеть ещё публикации.";

  return `<div class="feed-infinite-status${hiddenClass}" data-feed-status>${text}</div>`;
}

/** Рендерит набор HTML-строк карточек постов. */
export function renderFeedCards(items: PostcardModel[]): string {
  return items.map(renderPostcard).join("");
}

/** Рендерит центральную колонку ленты с первоначально видимой порцией карточек. */
export function renderIncrementalFeedCenter(items: PostcardModel[], renderedCount: number): string {
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
