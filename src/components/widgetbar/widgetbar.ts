import { getSuggestedUsers, getPublicPopularUsers, getLatestEvents } from "../../api/users";
import { getPopularPosts, getPublicPopularPosts } from "../../api/feed";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
} from "../../api/friends";
import { resolveProfilePath } from "../../pages/profile/profile-data";
import { getSessionUser } from "../../state/session";
import { prepareAvatarLinks, renderAvatarMarkup } from "../../utils/avatar";
import { TtlCache } from "../../utils/ttl-cache";

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

/** Кэш виджетбара с TTL 10 минут. Ключ: "guest" | "authorised". */
const widgetbarCache = new TtlCache<"guest" | "authorised", string>(10 * 60 * 1000);

// Временный выключатель, пока виджет не будет корректно восстановлен.
const SHOW_LATEST_EVENTS_WIDGET = false;

/**
 * Очищает кэш виджетбара.
 *
 * @returns {void}
 */
export function clearWidgetbarCache(): void {
  widgetbarCache.clear();
}

/**
 * Рендерит кнопку-заглушку.
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
 * Рендерит ссылку на профиль.
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
  isAuthorised: boolean,
): string {
  if (!isAuthorised) {
    return `
      <a
        href="/login"
        data-open-auth-modal="login"
        class="${className}"
      >
        ${text}
      </a>
    `;
  }

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

function renderWidgetbarAvatar(user: WidgetbarUser): string {
  const label = `${user.firstName} ${user.lastName}`.trim() || user.username || "Пользователь";
  return renderAvatarMarkup("widgetbar-person__avatar", label, user.avatarLink, {
    width: 32,
    height: 32,
  });
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
 * Рендерит виджет популярных пользователей для гостей.
 *
 * @returns {Promise<string>}
 */
async function renderPopularUsersWidget(): Promise<string> {
  const { items, failed } = await loadWidgetbarUsers("popular-users-guest", () =>
    getPublicPopularUsers(),
  );
  await prepareAvatarLinks(items.map((user) => user.avatarLink));
  const content = items.length
    ? items
        .map(
          (user) => `
            <div class="widgetbar-person">
              ${renderWidgetbarAvatar(user)}
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user,
                "widgetbar-card__username",
                false,
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
 * Рендерит виджет «Возможно, вы знакомы».
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
  const visibleItems = filteredItems.slice(0, 4);
  await prepareAvatarLinks(visibleItems.map((user) => user.avatarLink));

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Возможно, вы знакомы:</h3>

      ${
        visibleItems
          .map(
            (user) => `
            <div class="widgetbar-person">
              ${renderWidgetbarAvatar(user)}
              ${renderProfileLink(
                `${user.firstName} ${user.lastName}`,
                user,
                "widgetbar-card__username",
                true,
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
 * Рендерит виджет последних событий.
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
                false,
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
 * Рендерит виджет популярных постов для гостей.
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
 * Рендерит виджет популярных постов для авторизованного пользователя.
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
 * Рендерит погодный виджет.
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
 * Собирает разметку виджетбара для авторизованного пользователя.
 *
 * @returns {Promise<string>}
 */
async function buildAuthorisedWidgetbar(): Promise<string> {
  return `
    <aside class="widgetbar">
      ${await renderKnownPeopleWidget()}
      ${SHOW_LATEST_EVENTS_WIDGET ? await renderEventsWidget() : ""}
    </aside>
  `;
}

/**
 * Собирает разметку виджетбара для гостя.
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
 * Рендерит виджетбар.
 * Кэшируется на время текущей сессии страницы в браузере.
 *
 * @param {RenderWidgetbarOptions} options
 * @returns {Promise<string>}
 */
export async function renderWidgetbar({ isAuthorised }: RenderWidgetbarOptions): Promise<string> {
  const key = isAuthorised ? "authorised" : "guest";
  const cached = widgetbarCache.get(key);
  if (cached) return cached;

  const html = isAuthorised ? await buildAuthorisedWidgetbar() : await buildGuestWidgetbar();
  widgetbarCache.set(key, html);
  return html;
}
