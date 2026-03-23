import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { getFeedMode, getSessionUser } from "../../state/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";
import { getFeed, getPublicFeed, mapFeedResponse } from "../../api/feed.js";

/**
 * In-memory feed cache for the current browser page session.
 * It is reset only on full page reload.
 * @type {{
 *   guest: {"by-time": string|null, "for-you": string|null},
 *   authorised: {"by-time": string|null, "for-you": string|null}
 * }}
 */
const feedCache = {
  guest: {
    "by-time": null,
    "for-you": null,
  },
  authorised: {
    "by-time": null,
    "for-you": null,
  },
};

/**
 * Clears feed cache.
 * @returns {void}
 */
export function clearFeedCache() {
  feedCache.guest["by-time"] = null;
  feedCache.guest["for-you"] = null;
  feedCache.authorised["by-time"] = null;
  feedCache.authorised["for-you"] = null;
}

/**
 * Returns sorted feed items for the current feed mode.
 * "for-you" is shuffled once and then cached by the caller.
 *
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
 * Builds guest feed center markup.
 * @returns {Promise<string>}
 */
async function buildGuestFeed() {
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
 * Builds authorised feed center markup.
 * @returns {Promise<string>}
 */
async function buildAuthorisedFeed() {
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
 *  * Returns cached feed center markup for the current auth state and feed mode.
 * Builds and caches it on first request.
 *
 * @param {boolean} isAuthorised
 * @returns {Promise<string>}
 */
async function getCachedFeed(isAuthorised) {
  const authKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getFeedMode();

  if (feedCache[authKey][modeKey]) {
    return feedCache[authKey][modeKey];
  }

  const html = isAuthorised ? await buildAuthorisedFeed() : await buildGuestFeed();
  feedCache[authKey][modeKey] = html;

  return html;
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

        ${await getCachedFeed(isAuthorised)}

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
  const html = await getCachedFeed(isAuthorised);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const newCenter = template.content.firstElementChild;
  if (!newCenter) return;

  center.replaceWith(newCenter);
}
