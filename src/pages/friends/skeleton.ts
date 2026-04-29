/**
 * Скелетон страницы друзей.
 *
 * Содержит разметку загрузочного состояния страницы.
 */
import { renderHeaderSkeleton } from "../../components/header/header-skeleton";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbarSkeleton } from "../../components/widgetbar/widgetbar-skeleton";

function renderFriendSkeletonCard(): string {
  return `
    <article class="friends-card" aria-hidden="true">
      <div class="friends-card__avatar-link">
        <span class="friends-card__avatar avatar-skeleton skeleton"></span>
      </div>
      <div class="friends-card__body" style="display:flex;flex-direction:column;gap:8px">
        <span class="skeleton" style="display:block;width:170px;height:16px"></span>
        <span class="skeleton" style="display:block;width:92px;height:14px"></span>
        <div class="friends-card__actions" style="margin-top:2px">
          <span class="skeleton" style="display:block;width:92px;height:24px;border-radius:var(--radius-xs)"></span>
          <span class="skeleton" style="display:block;width:118px;height:24px;border-radius:var(--radius-xs)"></span>
        </div>
      </div>
    </article>
  `;
}

function renderFriendsPanelSkeleton(): string {
  const cards = Array.from({ length: 3 }, renderFriendSkeletonCard).join("");

  return `
    <section class="friends-page" data-friends-page>
      <section class="friends-panel content-card" aria-hidden="true">
        <header class="friends-panel__header">
          <span class="skeleton" style="display:block;width:190px;height:16px"></span>
        </header>

        <nav class="friends-tabs" aria-label="Фильтр друзей">
          <span class="skeleton" style="display:block;width:118px;height:30px;border-radius:var(--radius-small)"></span>
          <span class="skeleton" style="display:block;width:154px;height:30px;border-radius:var(--radius-small)"></span>
          <span class="skeleton" style="display:block;width:164px;height:30px;border-radius:var(--radius-small)"></span>
        </nav>

        <div class="friends-list" data-friends-list>
          ${cards}
        </div>
      </section>
    </section>
  `;
}

export function renderFriendsSkeleton(): string {
  return `
    <div class="app-page">
      ${renderHeaderSkeleton()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${renderFriendsPanelSkeleton()}
        </section>
        <aside class="app-layout__right">
          ${renderWidgetbarSkeleton()}
        </aside>
      </main>
    </div>
  `;
}
