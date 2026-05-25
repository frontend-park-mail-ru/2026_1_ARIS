/**
 * Страница поиска.
 *
 * Отвечает за:
 * - рендер результатов поиска по людям, сообществам и постам
 * - предзаполнение поискового инпута в хедере текущим запросом
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { t } from "../../state/i18n";
import { getLanguageMode } from "../../state/language";
import { getSessionUser } from "../../state/session";
import { renderAvatarMarkup, escapeHtml, prepareAvatarLinks } from "../../utils/avatar";
import {
  searchUsersAndCommunities,
  type SearchUser,
  type SearchCommunity,
  type SearchPost,
  type SearchResponse,
} from "../../api/search";

function getUserDisplayName(user: SearchUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || t("widgetbar.userFallback");
}

function formatPostTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t("postcard.justNow");
  if (minutes < 60) return `${minutes} ${t("postcard.minutesAgo")}`;
  if (hours < 24) return `${hours} ${t("postcard.hoursAgo")}`;
  if (days < 30) return `${days} ${t("postcard.daysAgo")}`;
  return new Intl.DateTimeFormat(getLanguageMode() === "EN" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatSearchTitle(query: string): string {
  return t("search.resultsTitle").replace("{query}", query);
}

function renderUserCard(user: SearchUser): string {
  const name = getUserDisplayName(user);
  const profilePath = `/id${encodeURIComponent(String(user.profileId))}`;

  return `
    <article class="search-result-card">
      <a href="${profilePath}" data-link class="search-result-card__avatar-link">
        ${renderAvatarMarkup("search-result-card__avatar", name, user.avatarUrl)}
      </a>
      <div class="search-result-card__body">
        <a href="${profilePath}" data-link class="search-result-card__name">${escapeHtml(name)}</a>
      </div>
    </article>
  `;
}

function renderCommunityCard(community: SearchCommunity): string {
  const name = community.title || t("search.communityFallback");
  const communityPath = `/communities/${encodeURIComponent(String(community.id))}`;

  return `
    <article class="search-result-card">
      <a href="${communityPath}" data-link class="search-result-card__avatar-link">
        ${renderAvatarMarkup("search-result-card__avatar", name, community.avatarUrl)}
      </a>
      <div class="search-result-card__body">
        <a href="${communityPath}" data-link class="search-result-card__name">${escapeHtml(name)}</a>
        <p class="search-result-card__meta">${community.bio ? escapeHtml(community.bio) : t("search.communityFallback")}</p>
      </div>
    </article>
  `;
}

function renderPostCard(post: SearchPost): string {
  const postPath = `/posts/${encodeURIComponent(String(post.id))}`;
  const authorPath = `/id${encodeURIComponent(String(post.authorProfileId))}`;
  const authorName = `${post.authorFirstName} ${post.authorLastName}`.trim() || post.authorUsername;
  const preview =
    post.text.length > 150 ? escapeHtml(post.text.slice(0, 150)) + "…" : escapeHtml(post.text);
  const time = formatPostTime(post.createdAt);

  return `
    <article class="search-result-card search-result-card--post">
      <a href="${authorPath}" data-link class="search-result-card__avatar-link">
        ${renderAvatarMarkup("search-result-card__avatar", authorName, post.authorAvatarUrl)}
      </a>
      <div class="search-result-card__body">
        <div class="search-result-card__post-header">
          <a href="${authorPath}" data-link class="search-result-card__name">${escapeHtml(authorName)}</a>
          ${time ? `<span class="search-result-card__meta">${time}</span>` : ""}
        </div>
        <a href="${postPath}" data-link class="search-result-card__post-text">${preview}</a>
      </div>
    </article>
  `;
}

function renderSearchResults(query: string, results: SearchResponse | null, error: string): string {
  if (!query.trim()) {
    return `<p class="search-page__hint">${t("search.emptyHint")}</p>`;
  }

  if (error) {
    return `<p class="search-page__error">${escapeHtml(error)}</p>`;
  }

  if (!results) return "";

  if (!results.users.length && !results.communities.length && !results.posts.length) {
    return `<p class="search-page__empty">${t("friends.noneFound")}</p>`;
  }

  const usersSection = results.users.length
    ? `
      <section class="search-section">
        <h2 class="search-section__heading">${t("search.people")}</h2>
        <div class="search-results-list">${results.users.map(renderUserCard).join("")}</div>
      </section>
    `
    : "";

  const communitiesSection = results.communities.length
    ? `
      <section class="search-section">
        <h2 class="search-section__heading">${t("search.communities")}</h2>
        <div class="search-results-list">${results.communities.map(renderCommunityCard).join("")}</div>
      </section>
    `
    : "";

  const postsSection = results.posts.length
    ? `
      <section class="search-section">
        <h2 class="search-section__heading">${t("search.posts")}</h2>
        <div class="search-results-list">${results.posts.map(renderPostCard).join("")}</div>
      </section>
    `
    : "";

  return `${usersSection}${communitiesSection}${postsSection}`;
}

export async function renderSearch(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const currentUser = getSessionUser();
  if (!currentUser) {
    return (await import("../feed/feed")).renderFeed(undefined, signal);
  }

  const query = new URLSearchParams(window.location.search).get("q") ?? "";

  let results: SearchResponse | null = null;
  let error = "";

  if (query.trim()) {
    try {
      results = await searchUsersAndCommunities(query.trim(), signal);
      await prepareAvatarLinks([
        ...results.users.map((u) => u.avatarUrl),
        ...results.communities.map((c) => c.avatarUrl),
        ...results.posts.map((p) => p.authorAvatarUrl),
      ]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      error = t("search.loadError");
    }
  }

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          <section class="search-page" data-search-page>
            <section class="search-panel content-card">
              <h1 class="search-panel__title">
                ${query ? escapeHtml(formatSearchTitle(query)) : t("search.title")}
              </h1>
              ${renderSearchResults(query, results, error)}
            </section>
          </section>
        </section>
        <aside class="app-layout__right app-layout__right--optional">
          ${await renderWidgetbar({ isAuthorised: true })}
        </aside>
      </main>
    </div>
  `;
}

export function initSearch(_root: Document | HTMLElement = document): void {
  // Заполнение инпута хедера текущим запросом происходит при рендере
  // через renderAuthorisedHeader → getHeaderSearchValue.
}
