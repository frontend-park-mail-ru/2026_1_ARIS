import { renderHeader } from "../../components/header/header.js";

/**
 * Renders the public feed page.
 * @returns {string}
 */
export function renderFeed() {
  return `
  
    <div class="feed-page">
      ${renderHeader()}

      <main class="feed-layout">
        <aside class="feed-layout__left">
          <nav class="left-sidebar">
            <a href="/feed" data-link class="left-sidebar__link left-sidebar__link--active">Лента</a>
            <a href="/profile" data-link class="left-sidebar__link">Профиль</a>
            <a href="/login" data-link class="left-sidebar__link">Вход</a>
          </nav>
        </aside>

        <section class="feed-layout__center">
          <article class="post-card">
            <h2 class="post-card__author">Михаил Иванов</h2>
            <p class="post-card__text">Сегодня наконец сделал 20 подтягиваний подряд...</p>
          </article>

          <article class="post-card">
            <h2 class="post-card__author">Команда ARIS</h2>
            <p class="post-card__text">Добро пожаловать в ARIS :)</p>
          </article>
        </section>

        <aside class="feed-layout__right">
          <section class="info-card">
            <h3 class="info-card__title">Популярные пользователи</h3>
            <p class="info-card__text">Иван Иванов</p>
            <p class="info-card__text">Петр Петров</p>
          </section>
        </aside>
      </main>
    </div>
  `;
}
