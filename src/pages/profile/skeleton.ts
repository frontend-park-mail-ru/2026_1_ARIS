/**
 * Скелетон страницы профиля.
 *
 * Содержит разметку загрузочного состояния страницы.
 */
import { renderHeaderSkeleton } from "../../components/header/header-skeleton";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { getSessionUser } from "../../state/session";

function renderProfilePostSkeleton(): string {
  return `
    <article class="profile-post content-card" aria-hidden="true">
      <header class="profile-post__header">
        <span class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></span>
        <span class="skeleton" style="width:130px;height:14px;align-self:center"></span>
      </header>
      <div style="display:flex;flex-direction:column;gap:8px;padding-block:12px">
        <span class="skeleton" style="width:100%;height:13px"></span>
        <span class="skeleton" style="width:78%;height:13px"></span>
        <span class="skeleton" style="width:54%;height:13px"></span>
      </div>
      <footer class="profile-post__footer">
        <span class="skeleton" style="width:80px;height:12px"></span>
      </footer>
    </article>
  `;
}

function renderProfileRightRailSkeleton(): string {
  const friendItems = Array.from(
    { length: 4 },
    () => `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0">
      <span class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></span>
      <span class="skeleton" style="width:110px;height:14px"></span>
    </div>
  `,
  ).join("");

  return `
    <section class="profile-friends-card" aria-hidden="true">
      <div class="profile-friends-card__header">
        <span class="skeleton" style="width:80px;height:18px"></span>
      </div>
      <div class="profile-friends-card__list" style="display:flex;flex-direction:column">
        ${friendItems}
      </div>
    </section>
  `;
}

export function renderProfileSkeleton(): string {
  const isAuthorised = getSessionUser() !== null;
  const posts = Array.from({ length: 3 }, renderProfilePostSkeleton).join("");

  return `
    <div class="app-page">
      ${renderHeaderSkeleton()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>
        <section class="app-layout__center">
          <section class="profile-page" aria-hidden="true">
            <article class="profile-card content-card">
              <header class="profile-card__hero">
                <div class="profile-card__avatar-column">
                  <span class="skeleton" style="width:96px;height:96px;border-radius:50%"></span>
                </div>
                <div class="profile-card__hero-copy" style="display:flex;flex-direction:column;gap:12px">
                  <span class="skeleton" style="width:180px;height:22px"></span>
                  <span class="skeleton" style="width:130px;height:16px"></span>
                  <span class="skeleton" style="width:200px;height:34px;border-radius:var(--radius-xs)"></span>
                </div>
              </header>
              <div class="profile-card__details" style="display:flex;flex-direction:column;gap:12px;padding-top:16px">
                <span class="skeleton" style="width:110px;height:16px"></span>
                <span class="skeleton" style="width:68%;height:14px"></span>
                <span class="skeleton" style="width:52%;height:14px"></span>
              </div>
            </article>
            <section class="profile-posts">
              <div class="profile-posts__list">${posts}</div>
            </section>
          </section>
        </section>
        <aside class="app-layout__right app-layout__right--rail">
          ${renderProfileRightRailSkeleton()}
        </aside>
      </main>
    </div>
  `;
}
