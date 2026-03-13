import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { mockSession } from "../../mock/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";
import { getFeed } from "../../api/feed.js";

/**
 * Renders the guest feed.
 * @returns {string}
 */
async function renderGuestFeed() {
  const getPosts = await getFeed();

  return `
    <section class="feed-layout__center">
      ${getPosts.posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the authorised feed.
 * @returns {string}
 */
async function renderAuthorisedFeed() {
  const getPosts = await getFeed();

  return `
    <section class="feed-layout__center">
      ${getPosts.posts.reverse().map(renderPostcard).join("")}
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
          ${renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}
