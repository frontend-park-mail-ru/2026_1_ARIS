/**
 * Страница поиска.
 *
 * Отвечает за:
 * - рендер результатов поиска по людям и сообществам
 * - предзаполнение поискового инпута в хедере текущим запросом
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getSessionUser } from "../../state/session";
import { renderAvatarMarkup, escapeHtml, prepareAvatarLinks } from "../../utils/avatar";
import {
  searchUsersAndCommunities,
  type SearchUser,
  type SearchCommunity,
  type SearchResponse,
} from "../../api/search";

function getUserDisplayName(user: SearchUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.username || "Пользователь";
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
        <p class="search-result-card__meta">@${escapeHtml(user.username)}</p>
      </div>
    </article>
  `;
}

function renderCommunityCard(community: SearchCommunity): string {
  const name = community.title || community.username;
  const communityPath = `/communities/${encodeURIComponent(String(community.id))}`;

  return `
    <article class="search-result-card">
      <a href="${communityPath}" data-link class="search-result-card__avatar-link">
        ${renderAvatarMarkup("search-result-card__avatar", name, community.avatarUrl)}
      </a>
      <div class="search-result-card__body">
        <a href="${communityPath}" data-link class="search-result-card__name">${escapeHtml(name)}</a>
        <p class="search-result-card__meta">${community.bio ? escapeHtml(community.bio) : "Сообщество"}</p>
      </div>
    </article>
  `;
}

function renderSearchResults(query: string, results: SearchResponse | null, error: string): string {
  if (!query.trim()) {
    return `<p class="search-page__hint">Введите запрос, чтобы найти людей и сообщества.</p>`;
  }

  if (error) {
    return `<p class="search-page__error">${escapeHtml(error)}</p>`;
  }

  if (!results) return "";

  const usersHtml = results.users.length
    ? results.users.map(renderUserCard).join("")
    : `<p class="search-page__empty">Пользователи не найдены.</p>`;

  const communitiesHtml = results.communities.length
    ? results.communities.map(renderCommunityCard).join("")
    : `<p class="search-page__empty">Сообщества не найдены.</p>`;

  return `
    <section class="search-section">
      <h2 class="search-section__heading">Люди</h2>
      <div class="search-results-list">${usersHtml}</div>
    </section>

    <section class="search-section">
      <h2 class="search-section__heading">Сообщества</h2>
      <div class="search-results-list">${communitiesHtml}</div>
    </section>
  `;
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
      ]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      error = "Не удалось загрузить результаты поиска.";
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
                ${query ? `Результаты поиска: «${escapeHtml(query)}»` : "Поиск"}
              </h1>
              ${renderSearchResults(query, results, error)}
            </section>
          </section>
        </section>
        <aside class="app-layout__right">
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
