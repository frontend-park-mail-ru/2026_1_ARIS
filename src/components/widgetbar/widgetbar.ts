import { getSuggestedUsers, getPublicPopularUsers, getLatestEvents } from "../../api/users";
import { getPopularPosts, getPublicPopularPosts } from "../../api/feed";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
} from "../../api/friends";
import { resolveProfilePath } from "../../pages/profile/profile-data";
import { getSessionUser } from "../../state/session";

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

type WidgetbarLoadResult<T> = {
  items: T[];
  failed: boolean;
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

function renderWidgetbarEmptyState(text: string): string {
  return `<p class="widgetbar-card__empty">${text}</p>`;
}

/**
 * Renders a profile link.
 *
 * @param {string} text
 * @param {string} profileId
 * @param {string} className
 * @returns {string}
 */
function renderProfileLink(
  text: string,
  user: Pick<WidgetbarUser, "id" | "username" | "firstName" | "lastName">,
  className: string,
): string {
  return `
    <a
      href="${resolveProfilePath({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      })}"
      data-link
      class="${className}"
    >
      ${text}
    </a>
  `;
}

function resolveAvatarSrc(avatarLink?: string): string {
  if (!avatarLink) {
    return "/assets/img/default-avatar.png";
  }

  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
    return avatarLink;
  }

  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
}

function getUserKey(user: WidgetbarUser): string {
  return String(user.id || user.username || `${user.firstName}-${user.lastName}`);
}

function normaliseIdentity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "");
}

function isArisTeamUser(user: WidgetbarUser): boolean {
  const identities = [
    user.username,
    `${user.firstName}${user.lastName}`,
    `${user.firstName} ${user.lastName}`,
  ].map(normaliseIdentity);

  return identities.some(
    (identity) =>
      identity === "komandaaris" || identity === "командаарис" || identity === "aristeam",
  );
}

function mergeUniqueUsers(groups: WidgetbarUser[][]): WidgetbarUser[] {
  const seen = new Set<string>();
  const result: WidgetbarUser[] = [];

  groups.forEach((group) => {
    group.forEach((user) => {
      const key = getUserKey(user);
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      result.push(user);
    });
  });

  return result;
}

async function loadWidgetbarUsers(
  scope: string,
  loader: () => Promise<{ items?: WidgetbarUser[] | WidgetbarEventUser[] }>,
): Promise<WidgetbarLoadResult<WidgetbarUser>> {
  try {
    const response = await loader();
    return {
      items: Array.isArray(response.items) ? [...response.items] : [],
      failed: false,
    };
  } catch (error) {
    console.warn(`[widgetbar] source=api scope=${scope} failed`, error);
    return {
      items: [],
      failed: true,
    };
  }
}

async function loadExcludedFriendIds(
  scope: string,
  loader: () => Promise<Array<{ profileId: string }>>,
): Promise<string[]> {
  try {
    const items = await loader();
    return items.map((user) => String(user.profileId)).filter(Boolean);
  } catch (error) {
    console.warn(`[widgetbar] source=api scope=${scope} failed`, error);
    return [];
  }
}

async function loadWidgetbarPosts(
  scope: string,
  loader: () => Promise<{ items?: WidgetbarPost[] }>,
): Promise<WidgetbarLoadResult<WidgetbarPost>> {
  try {
    const response = await loader();
    return {
      items: Array.isArray(response.items) ? [...response.items] : [],
      failed: false,
    };
  } catch (error) {
    console.warn(`[widgetbar] source=api scope=${scope} failed`, error);
    return {
      items: [],
      failed: true,
    };
  }
}

/**
 * Renders popular users widget for guests.
 *
 * @returns {Promise<string>}
 */
async function renderPopularUsersWidget(): Promise<string> {
  const { items, failed } = await loadWidgetbarUsers("popular-users-guest", () =>
    getPublicPopularUsers(),
  );
  const content = items.length
    ? items
        .map(
          (user) => `
            <div class="widgetbar-person">
              ${
                user.avatarLink
                  ? `<img class="widgetbar-person__avatar" src="${resolveAvatarSrc(user.avatarLink)}" alt="${user.firstName} ${user.lastName}">`
                  : `<img class="widgetbar-person__avatar" src="/assets/img/default-avatar.png" alt="${user.firstName} ${user.lastName}">`
              }
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user,
                "widgetbar-card__username",
              )}
            </div>
          `,
        )
        .join("")
    : renderWidgetbarEmptyState(
        failed ? "Не удалось загрузить пользователей." : "Пока здесь никого нет.",
      );

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные пользователи</h3>

      ${content}
    </section>
  `;
}

/**
 * Renders known people widget.
 *
 * @returns {Promise<string>}
 */
async function renderKnownPeopleWidget(): Promise<string> {
  const [suggestedResult, popularResult, eventResult, friends, incoming, outgoing] =
    await Promise.all([
      loadWidgetbarUsers("suggested-users", () => getSuggestedUsers()),
      loadWidgetbarUsers("popular-users", () => getPublicPopularUsers()),
      loadWidgetbarUsers("latest-events", () => getLatestEvents()),
      loadExcludedFriendIds("friends", () => getFriends("accepted")),
      loadExcludedFriendIds("incoming-friend-requests", () => getIncomingFriendRequests("pending")),
      loadExcludedFriendIds("outgoing-friend-requests", () => getOutgoingFriendRequests("pending")),
    ]);
  const items = mergeUniqueUsers([suggestedResult.items, popularResult.items, eventResult.items]);
  const excludedIds = new Set([...friends, ...incoming, ...outgoing]);
  const currentUserId = String(getSessionUser()?.id ?? "");
  const failed = suggestedResult.failed || popularResult.failed || eventResult.failed;
  const filteredItems = items.filter((user) => {
    const userId = String(user.id);
    return (
      Boolean(userId) &&
      userId !== currentUserId &&
      !excludedIds.has(userId) &&
      !isArisTeamUser(user)
    );
  });

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Возможно, вы знакомы:</h3>

      ${
        filteredItems
          .slice(0, 4)
          .map(
            (user) => `
            <div class="widgetbar-person">
              <img
                class="widgetbar-person__avatar"
                src="${resolveAvatarSrc(user.avatarLink)}"
                alt="${user.firstName} ${user.lastName}"
              >
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user,
                "widgetbar-card__username",
              )}
            </div>
          `,
          )
          .join("") ||
        renderWidgetbarEmptyState(
          failed ? "Не удалось загрузить рекомендации." : "Новые рекомендации появятся позже.",
        )
      }
    </section>
  `;
}

/**
 * Renders latest events widget.
 *
 * @returns {Promise<string>}
 */
async function renderEventsWidget(): Promise<string> {
  const result = await loadWidgetbarUsers("latest-events-guest", () => getLatestEvents());
  const items = result.items as WidgetbarEventUser[];
  const content = items.length
    ? `
        <div class="widgetbar-card__events">
          ${items
            .map((user) => {
              const userLink = renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user,
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
      `
    : renderWidgetbarEmptyState(
        result.failed ? "Не удалось загрузить события." : "Пока событий нет.",
      );

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Последние события</h3>

      ${content}
    </section>
  `;
}

/**
 * Renders guest popular posts widget.
 *
 * @returns {Promise<string>}
 */
async function renderGuestPopularPostsWidget(): Promise<string> {
  const { items, failed } = await loadWidgetbarPosts("popular-posts-guest", () =>
    getPublicPopularPosts(),
  );
  const content = items.length
    ? items
        .map(
          (post) => `
            <a href="/login" data-open-auth-modal="login" class="widgetbar-card__post-link">
              ${post.title}
            </a>
          `,
        )
        .join("")
    : renderWidgetbarEmptyState(
        failed ? "Не удалось загрузить популярные посты." : "Пока популярных постов нет.",
      );

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      ${content}
    </section>
  `;
}

/**
 * Renders authorised popular posts widget.
 *
 * @returns {Promise<string>}
 */
async function renderAuthorisedPopularPostsWidget(): Promise<string> {
  const { items, failed } = await loadWidgetbarPosts("popular-posts-authorised", () =>
    getPopularPosts(),
  );
  const content = items.length
    ? items
        .map(
          (post) => `
            ${renderStubButton(post.title, "widgetbar-card__post-link")}
          `,
        )
        .join("")
    : renderWidgetbarEmptyState(
        failed ? "Не удалось загрузить популярные посты." : "Пока популярных постов нет.",
      );

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      ${content}
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
export async function renderWidgetbar({ isAuthorised }: RenderWidgetbarOptions): Promise<string> {
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
