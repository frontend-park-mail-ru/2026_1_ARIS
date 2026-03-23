import { getSuggestedUsers, getPublicPopularUsers, getLatestEvents } from "../../api/users";
import { getPopularPosts, getPublicPopularPosts } from "../../api/feed";

type WidgetbarCache = {
  guest: string | null;
  authorised: string | null;
};

type WidgetbarUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
};

type WidgetbarEventUser = WidgetbarUser & {
  type: number;
};

type WidgetbarPost = {
  title: string;
};

type RenderWidgetbarOptions = {
  isAuthorised: boolean;
};

/**
 * In-memory widgetbar cache for the current page session.
 * It is reset only on full page reload.
 */
const widgetbarCache: WidgetbarCache = {
  guest: null,
  authorised: null,
};

/**
 * Clears widgetbar cache.
 *
 * @returns {void}
 */
export function clearWidgetbarCache(): void {
  widgetbarCache.guest = null;
  widgetbarCache.authorised = null;
}

/**
 * Renders a stub button.
 *
 * @param {string} text
 * @param {string} className
 * @returns {string}
 */
function renderStubButton(text: string, className: string): string {
  return `
    <button type="button" class="${className} widgetbar-stub-button">
      ${text}
    </button>
  `;
}

/**
 * Renders a profile link.
 *
 * @param {string} text
 * @param {string} profileId
 * @param {string} className
 * @returns {string}
 */
function renderProfileLink(text: string, profileId: string, className: string): string {
  return `
    <a href="/profile/${profileId}" data-link class="${className}">
      ${text}
    </a>
  `;
}

/**
 * Renders popular users widget for guests.
 *
 * @returns {Promise<string>}
 */
async function renderPopularUsersWidget(): Promise<string> {
  const response = (await getPublicPopularUsers()) as { items?: WidgetbarUser[] };
  const items = Array.isArray(response.items) ? response.items : [];

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные пользователи</h3>

      ${items
        .map(
          (user) => `
            <div class="widgetbar-person">
              ${
                user.avatarLink
                  ? `<img class="widgetbar-person__avatar" src="/image-proxy?url=${encodeURIComponent(user.avatarLink)}" alt="${user.username}">`
                  : `<div class="widgetbar-person__avatar"></div>`
              }
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user.id,
                "widgetbar-card__username",
              )}
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

/**
 * Renders known people widget.
 *
 * @returns {Promise<string>}
 */
async function renderKnownPeopleWidget(): Promise<string> {
  const response = (await getSuggestedUsers()) as { items?: WidgetbarUser[] };
  const items = Array.isArray(response.items) ? response.items : [];

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Возможно, вы знакомы:</h3>

      ${items
        .slice(0, 4)
        .map(
          (user) => `
            <div class="widgetbar-person">
              <img
                class="widgetbar-person__avatar"
                src="${
                  user.avatarLink
                    ? `/image-proxy?url=${encodeURIComponent(user.avatarLink)}`
                    : `/assets/img/default-avatar.png`
                }"
                alt="${user.username}"
              >
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user.id,
                "widgetbar-card__username",
              )}
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

/**
 * Renders latest events widget.
 *
 * @returns {Promise<string>}
 */
async function renderEventsWidget(): Promise<string> {
  const response = (await getLatestEvents()) as { items?: WidgetbarEventUser[] };
  const items = Array.isArray(response.items) ? response.items : [];

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Последние события</h3>

      <div class="widgetbar-card__events">
        ${items
          .map((user) => {
            const userLink = renderProfileLink(
              `${user.firstName} ${user.lastName}`,
              user.id,
              "widgetbar-card__username",
            );

            if (user.type === 1) {
              return `
                <p class="widgetbar-card__event">
                  ${userLink}
                  <span class="widgetbar-card__text"> поставил лайк вашему </span>
                  ${renderStubButton("посту", "widgetbar-card__link")}
                </p>
              `;
            }

            if (user.type === 2) {
              return `
                <p class="widgetbar-card__event">
                  ${userLink}
                  <span class="widgetbar-card__text"> добавил </span>
                  ${renderStubButton("фото", "widgetbar-card__link")}
                </p>
              `;
            }

            return `
              <p class="widgetbar-card__event">
                ${userLink}
                <span class="widgetbar-card__text"> подписался на вас</span>
              </p>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

/**
 * Renders guest popular posts widget.
 *
 * @returns {Promise<string>}
 */
async function renderGuestPopularPostsWidget(): Promise<string> {
  const response = (await getPublicPopularPosts()) as { items?: WidgetbarPost[] };
  const items = Array.isArray(response.items) ? response.items : [];

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      ${items
        .map(
          (post) => `
            <a href="/login" data-open-auth-modal="login" class="widgetbar-card__post-link">
              ${post.title}
            </a>
          `,
        )
        .join("")}
    </section>
  `;
}

/**
 * Renders authorised popular posts widget.
 *
 * @returns {Promise<string>}
 */
async function renderAuthorisedPopularPostsWidget(): Promise<string> {
  const response = (await getPopularPosts()) as { items?: WidgetbarPost[] };
  const items = Array.isArray(response.items) ? response.items : [];

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      ${items
        .map(
          (post) => `
            ${renderStubButton(post.title, "widgetbar-card__post-link")}
          `,
        )
        .join("")}
    </section>
  `;
}

/**
 * Renders weather widget.
 *
 * @returns {string}
 */
function renderWeatherWidget(): string {
  return `
    <section class="widgetbar-card widgetbar-card--weather">
      <h3 class="widgetbar-card__title">Сегодня — Москва</h3>

      <p class="widgetbar-card__text">Днем: -7°C, ночью -17°C</p>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/weather-cloud.svg" alt="">
        </span>
        <span class="widgetbar-card__text">Пасмурно</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/sunrise.svg" alt="">
        </span>
        <span class="widgetbar-card__text">Восход: 07:19</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/sunset.svg" alt="">
        </span>
        <span class="widgetbar-card__text">Заход: 18:13</span>
      </div>
    </section>
  `;
}

/**
 * Builds widgetbar markup for authorised user.
 *
 * @returns {Promise<string>}
 */
async function buildAuthorisedWidgetbar(): Promise<string> {
  return `
    <aside class="widgetbar">
      ${await renderKnownPeopleWidget()}
      ${await renderEventsWidget()}
      ${await renderAuthorisedPopularPostsWidget()}
      ${renderWeatherWidget()}
    </aside>
  `;
}

/**
 * Builds widgetbar markup for guest user.
 *
 * @returns {Promise<string>}
 */
async function buildGuestWidgetbar(): Promise<string> {
  return `
    <aside class="widgetbar">
      ${await renderPopularUsersWidget()}
      ${await renderGuestPopularPostsWidget()}
      ${renderWeatherWidget()}
    </aside>
  `;
}

/**
 * Renders the widgetbar.
 * Cached for the current browser page session.
 *
 * @param {RenderWidgetbarOptions} options
 * @returns {Promise<string>}
 */
export async function renderWidgetbar({
  isAuthorised,
}: RenderWidgetbarOptions): Promise<string> {
  if (isAuthorised) {
    if (!widgetbarCache.authorised) {
      widgetbarCache.authorised = await buildAuthorisedWidgetbar();
    }

    return widgetbarCache.authorised;
  }

  if (!widgetbarCache.guest) {
    widgetbarCache.guest = await buildGuestWidgetbar();
  }

  return widgetbarCache.guest;
}