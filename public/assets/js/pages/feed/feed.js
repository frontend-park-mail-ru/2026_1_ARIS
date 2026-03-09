import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";

export function renderFeed() {
  const posts = Array.from({ length: 30 })
    .map(
      (_, index) => `
        <article class="post-card">
          <h2 class="post-card__author">Михаил Иванов ${index + 1}</h2>
          <p class="post-card__text">
            Сегодня наконец сделал 20 подтягиваний подряд. Делюсь программой тренировок.
          </p>
        </article>
      `,
    )
    .join("");

  return `
    <div class="feed-page">
      ${renderHeader()}

      <main class="feed-layout">
        <aside class="feed-layout__left">
          ${renderSidebar()}
        </aside>

        <section class="feed-layout__center">
          ${posts}
        </section>

        <aside class="feed-layout__right">
          <div class="info-card">
            <h3 class="info-card__title">Популярные пользователи</h3>
            <p class="info-card__text">Иван Иванов</p>
            <p class="info-card__text">Петр Петров</p>
          </div>
        </aside>
      </main>
    </div>
  `;
}
