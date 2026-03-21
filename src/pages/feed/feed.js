import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { getFeedMode, getSessionUser } from "../../state/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";
import { getFeed, getPublicFeed, mapFeedResponse } from "../../api/feed.js";

/**
 * Returns sorted feed items.
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function getSortedFeedItems(items) {
  const result = [...items];

  if (getFeedMode() === "for-you") {
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
 * @returns {Promise<string>}
 */
async function renderGuestFeed() {
  const response = await getPublicFeed({ limit: 2 });
  const mapped = mapFeedResponse(response);
  const posts = getSortedFeedItems(mapped.items);

  return `
    <section class="app-layout__center">
      ${posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the authorised feed.
 * @returns {Promise<string>}
 */
async function renderAuthorisedFeed() {
  const response = await getFeed({ limit: 8 });
  const mapped = mapFeedResponse(response);
  const posts = getSortedFeedItems(mapped.items);

  return `
    <section class="app-layout__center">
      ${posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the feed page.
 * @returns {Promise<string>}
 */
export async function renderFeed() {
  const isAuthorised = getSessionUser() !== null;

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        ${isAuthorised ? await renderAuthorisedFeed() : await renderGuestFeed()}

        <aside class="app-layout__right">
          ${await renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}

/**
 * Refreshes feed center in place.
 * @returns {Promise<void>}
 */
export async function refreshFeedCenter() {
  const center = document.querySelector(".app-layout__center");
  if (!center) return;

  const isAuthorised = getSessionUser() !== null;
  const html = isAuthorised ? await renderAuthorisedFeed() : await renderGuestFeed();

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const newCenter = template.content.firstElementChild;
  if (!newCenter) return;

  center.replaceWith(newCenter);
}
