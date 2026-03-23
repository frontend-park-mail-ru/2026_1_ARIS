import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getFeedMode, getSessionUser } from "../../state/session";
import { renderPostcard } from "../../components/postcard/postcard";
import {
  getFeed,
  getPublicFeed,
  mapFeedResponse,
  type PostcardModel,
} from "../../api/feed";

type FeedMode = "by-time" | "for-you";
type FeedAuthKey = "guest" | "authorised";

type FeedCache = Record<FeedAuthKey, Record<FeedMode, string | null>>;

/**
 * In-memory feed cache for the current browser page session.
 * It is reset only on full page reload.
 */
const feedCache: FeedCache = {
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
 * Checks whether a string is a valid feed mode.
 *
 * @param {string} value
 * @returns {value is FeedMode}
 */
function isFeedMode(value: string): value is FeedMode {
  return value === "by-time" || value === "for-you";
}

/**
 * Returns current feed mode in a narrowed type-safe form.
 *
 * @returns {FeedMode}
 */
function getCurrentFeedMode(): FeedMode {
  const mode = getFeedMode();
  return isFeedMode(mode) ? mode : "by-time";
}

/**
 * Clears feed cache.
 *
 * @returns {void}
 */
export function clearFeedCache(): void {
  feedCache.guest["by-time"] = null;
  feedCache.guest["for-you"] = null;
  feedCache.authorised["by-time"] = null;
  feedCache.authorised["for-you"] = null;
}

/**
 * Returns sorted feed items for the current feed mode.
 * "for-you" is shuffled once and then cached by the caller.
 *
 * @param {PostcardModel[]} items
 * @returns {PostcardModel[]}
 */
function getSortedFeedItems(items: PostcardModel[]): PostcardModel[] {
  const result = [...items];

  if (getCurrentFeedMode() === "for-you") {
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const current = result[i];
      const random = result[j];

      if (current && random) {
        result[i] = random;
        result[j] = current;
      }
    }

    return result;
  }

  return result.sort((a, b) => {
    const aTime = new Date(a.timeRaw).getTime();
    const bTime = new Date(b.timeRaw).getTime();
    return bTime - aTime;
  });
}

/**
 * Builds guest feed center markup.
 *
 * @returns {Promise<string>}
 */
async function buildGuestFeed(): Promise<string> {
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
 *
 * @returns {Promise<string>}
 */
async function buildAuthorisedFeed(): Promise<string> {
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
 * Returns cached feed center markup for the current auth state and feed mode.
 * Builds and caches it on first request.
 *
 * @param {boolean} isAuthorised
 * @returns {Promise<string>}
 */
async function getCachedFeed(isAuthorised: boolean): Promise<string> {
  const authKey: FeedAuthKey = isAuthorised ? "authorised" : "guest";
  const modeKey = getCurrentFeedMode();

  if (feedCache[authKey][modeKey]) {
    return feedCache[authKey][modeKey] as string;
  }

  const html = isAuthorised ? await buildAuthorisedFeed() : await buildGuestFeed();
  feedCache[authKey][modeKey] = html;

  return html;
}

/**
 * Renders the feed page.
 *
 * @returns {Promise<string>}
 */
export async function renderFeed(): Promise<string> {
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
 *
 * @returns {Promise<void>}
 */
export async function refreshFeedCenter(): Promise<void> {
  const center = document.querySelector(".app-layout__center");
  if (!(center instanceof HTMLElement)) return;

  const isAuthorised = getSessionUser() !== null;
  const html = await getCachedFeed(isAuthorised);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const newCenter = template.content.firstElementChild;
  if (!(newCenter instanceof HTMLElement)) return;

  center.replaceWith(newCenter);
}