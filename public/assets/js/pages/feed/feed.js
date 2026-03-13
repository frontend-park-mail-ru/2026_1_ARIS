import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { mockSession } from "../../mock/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";
import { getFeed, getPublicFeed, mapFeedResponse } from "../../api/feed.js";

function sortFeedItems(items) {
  if (mockSession.feedMode === "for-you") {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  return [...items].sort((a, b) => {
    const dateA = new Date(a.timeRaw || 0).getTime();
    const dateB = new Date(b.timeRaw || 0).getTime();
    return dateB - dateA;
  });
}

function getSortedFeedItems(items) {
  const result = [...items];

  if (mockSession.feedMode === "for-you") {
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  return result.sort((a, b) => new Date(b.timeRaw) - new Date(a.timeRaw));
}

/**
 * Renders the guest feed.
 * @returns {string}
 */
async function renderGuestFeed() {
  const response = await getPublicFeed({ limit: 2 });
  const mapped = mapFeedResponse(response);

  const posts = getSortedFeedItems(mapped.items);

  return `
    <section class="feed-layout__center">
      ${posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the authorised feed.
 * @returns {string}
 */
async function renderAuthorisedFeed() {
  const response = await getFeed({ limit: 8 });
  const mapped = mapFeedResponse(response);

  const posts = getSortedFeedItems(mapped.items);

  return `
    <section class="feed-layout__center">
      ${posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the feed page.
 * @returns {string}
 */
export async function renderFeed() {
  const isAuthorised = mockSession.user !== null;

  return `
    <div class="feed-page">
      ${renderHeader()}

      <main class="feed-layout">
        <aside class="feed-layout__left">
          ${renderSidebar({ isAuthorised: mockSession.user !== null })}
        </aside>

        ${isAuthorised ? await renderAuthorisedFeed() : await renderGuestFeed()}

        <aside class="feed-layout__right">
          ${await renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}

export async function refreshFeedCenter() {
  const center = document.querySelector(".feed-layout__center");
  if (!center) return;

  const isAuthorised = mockSession.user !== null;
  const html = isAuthorised ? await renderAuthorisedFeed() : await renderGuestFeed();

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const newCenter = template.content.firstElementChild;
  if (!newCenter) return;

  center.replaceWith(newCenter);
}
