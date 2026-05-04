/**
 * Скелетоны страницы сообществ.
 */
import { renderHeaderSkeleton } from "../../components/header/header-skeleton";
import { renderSidebar } from "../../components/sidebar/sidebar";

function renderCommunityListSkeletonCard(): string {
  return `
    <article class="community-list-card" aria-hidden="true">
      <span class="avatar-skeleton community-skeleton__list-avatar"></span>
      <div class="community-list-card__body">
        <span class="skeleton" style="display:block;width:180px;height:16px"></span>
        <span class="skeleton" style="display:block;width:112px;height:13px;margin-top:7px"></span>
      </div>
    </article>
  `;
}

function renderCommunityListSkeletonContent(): string {
  return `
    <section class="communities-page" data-communities-page>
      <span class="profile-composer content-card skeleton" style="display:block;height:44px"></span>
      <section class="communities-panel content-card">
        <span class="skeleton" style="display:block;width:100%;height:40px;border-radius:var(--radius-small)"></span>
        <div class="communities-list">
          ${Array.from({ length: 3 }, renderCommunityListSkeletonCard).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderCommunityDetailSkeletonContent(): string {
  return `
    <section class="communities-page community-detail" data-communities-page>
      <article class="community-hero content-card" aria-hidden="true">
        <div class="community-skeleton__cover skeleton"></div>
        <div class="community-hero__body">
          <div class="community-hero__avatar-wrap">
            <span class="avatar-skeleton community-skeleton__hero-avatar"></span>
          </div>
          <div class="community-hero__copy">
            <span class="skeleton" style="display:block;width:180px;height:24px"></span>
            <span class="skeleton" style="display:block;width:132px;height:14px;margin-top:10px"></span>
          </div>
          <span class="skeleton" style="display:block;width:28px;height:28px;border-radius:999px;justify-self:end"></span>
        </div>
      </article>

      <section class="community-posts" aria-hidden="true">
        <span class="profile-composer content-card skeleton" style="display:block;height:44px"></span>
        <header class="profile-posts__header community-posts__header content-card">
          <span class="skeleton" style="display:block;width:118px;height:24px"></span>
        </header>
        <div class="profile-posts__list">
          <article class="profile-post content-card">
            <div class="profile-post__header">
              <div class="profile-post__author">
                <span class="avatar-skeleton community-skeleton__post-avatar"></span>
                <div class="profile-post__meta" style="width:100%">
                  <span class="skeleton" style="display:block;width:144px;height:16px"></span>
                  <span class="skeleton" style="display:block;width:96px;height:13px;margin-top:8px"></span>
                </div>
              </div>
            </div>
            <span class="skeleton" style="display:block;width:100%;height:72px;border-radius:16px;margin-top:12px"></span>
          </article>
        </div>
      </section>
    </section>
  `;
}

function renderCommunityDetailSkeletonRail(): string {
  return `
    <div class="profile-right-rail community-right-rail" aria-hidden="true">
      <section class="community-side-card">
        <span class="skeleton" style="display:block;width:92px;height:22px"></span>
        <span class="skeleton" style="display:block;width:100%;height:34px;margin-top:12px"></span>
      </section>
      <section class="community-side-card">
        <span class="skeleton" style="display:block;width:104px;height:22px"></span>
        <span class="skeleton" style="display:block;width:100%;height:58px;margin-top:12px"></span>
      </section>
    </div>
  `;
}

export function renderCommunitiesSkeleton(path = "/communities"): string {
  const isDetailRoute = /^\/communities\/[^/]+$/.test(path.replace(/\/+$/g, ""));

  return `
    <div class="app-page">
      ${renderHeaderSkeleton()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${isDetailRoute ? renderCommunityDetailSkeletonContent() : renderCommunityListSkeletonContent()}
        </section>
        <aside class="app-layout__right ${isDetailRoute ? "app-layout__right--rail" : "app-layout__right--optional"}">
          ${isDetailRoute ? renderCommunityDetailSkeletonRail() : '<div class="profile-right-rail"></div>'}
        </aside>
      </main>
    </div>
  `;
}
