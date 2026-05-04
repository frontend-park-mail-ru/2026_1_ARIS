/**
 * Правая колонка с рекомендательными виджетами.
 *
 * Отвечает за:
 * - подбор пользователей для гостя и авторизованного пользователя
 * - объединение нескольких источников рекомендаций
 * - кэширование готовой разметки на короткое время
 */
import { getSuggestedUsers, getPublicPopularUsers, getLatestEvents } from "../../api/users";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
} from "../../api/friends";
import { resolveProfilePath } from "../../pages/profile/profile-data";
import { getSessionUser } from "../../state/session";
import { t } from "../../state/i18n";
import { prepareAvatarLinks, renderAvatarMarkup } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
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
 * @param {string} text Текст кнопки.
 * @param {string} className CSS-класс.
 * @returns {string} HTML-разметка кнопки.
 */
function renderStubButton(text: string, className: string): string {
  return `
    <button type="button" class="${className} widgetbar-stub-button">
      ${text}
    </button>
  `;
}

/**
 * Рендерит пустое состояние карточки виджетбара.
 *
 * @param {string} text Текст сообщения.
 * @returns {string} HTML-разметка пустого состояния.
 */
function renderWidgetbarEmptyState(text: string): string {
  return `<p class="widgetbar-card__empty">${text}</p>`;
}

/**
 * Рендерит ссылку на профиль.
 *
 * Для гостя ссылка ведёт в авторизацию, чтобы не показывать защищённые профили
 * как будто они доступны без сессии.
 *
 * @param {string} text Текст ссылки.
 * @param {Pick<WidgetbarUser, "id" | "username" | "firstName" | "lastName">} user Пользователь ссылки.
 * @param {string} className CSS-класс ссылки.
 * @param {boolean} isAuthorised Авторизован ли текущий пользователь.
 * @returns {string} HTML-разметка ссылки.
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

/**
 * Рендерит аватар пользователя для карточек виджетбара.
 *
 * @param {WidgetbarUser} user Пользователь виджета.
 * @returns {string} HTML-разметка аватара.
 */
function renderWidgetbarAvatar(user: WidgetbarUser): string {
  const label =
    formatPersonName(user.firstName, user.lastName, user.username) || t("widgetbar.userFallback");
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

/**
 * Объединяет несколько групп пользователей без дублей.
 *
 * @param {WidgetbarUser[][]} groups Наборы пользователей из разных источников.
 * @returns {WidgetbarUser[]} Уникальный список пользователей.
 */
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

/**
 * Загружает список пользователей для виджета с безопасным fallback.
 *
 * @param {string} scope Техническое имя источника для логов.
 * @param {() => Promise<{ items?: WidgetbarUser[] | WidgetbarEventUser[] }>} loader Функция загрузки.
 * @returns {Promise<WidgetbarLoadResult<WidgetbarUser>>} Результат с флагом ошибки.
 */
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

/**
 * Загружает идентификаторы пользователей, которых нужно исключить из рекомендаций.
 *
 * @param {string} scope Техническое имя источника для логов.
 * @param {() => Promise<Array<{ profileId: string }>>} loader Функция загрузки.
 * @returns {Promise<string[]>} Идентификаторы профилей.
 */
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

/**
 * Рендерит виджет популярных пользователей для гостей.
 *
 * @returns {Promise<string>} HTML карточки виджета.
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
                formatPersonName(user.firstName, user.lastName, user.username),
                user,
                "widgetbar-card__username",
                false,
              )}
            </div>
          `,
        )
        .join("")
    : renderWidgetbarEmptyState(failed ? t("widgetbar.loadUsersError") : t("common.emptyList"));

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">${t("widgetbar.popularUsers")}</h3>

      ${content}
    </section>
  `;
}

/**
 * Рендерит виджет «Возможно, вы знакомы».
 *
 * @returns {Promise<string>} HTML карточки виджета.
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
      <h3 class="widgetbar-card__title">${t("widgetbar.maybeYouKnow")}</h3>

      ${
        visibleItems
          .map(
            (user) => `
            <div class="widgetbar-person">
              ${renderWidgetbarAvatar(user)}
              ${renderProfileLink(
                formatPersonName(user.firstName, user.lastName, user.username),
                user,
                "widgetbar-card__username",
                true,
              )}
            </div>
          `,
          )
          .join("") ||
        renderWidgetbarEmptyState(
          failed ? t("widgetbar.loadRecommendationsError") : t("common.emptyList"),
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
                formatPersonName(user.firstName, user.lastName, user.username),
                user,
                "widgetbar-card__username",
                false,
              );

              if (user.type === 1) {
                return `
                  <p class="widgetbar-card__event">
                    ${userLink}
                    <span class="widgetbar-card__text">${t("widgetbar.likedYour")}</span>
                    ${renderStubButton(t("widgetbar.post"), "widgetbar-card__link")}
                  </p>
                `;
              }

              if (user.type === 2) {
                return `
                  <p class="widgetbar-card__event">
                    ${userLink}
                    <span class="widgetbar-card__text">${t("widgetbar.added")}</span>
                    ${renderStubButton(t("widgetbar.photo"), "widgetbar-card__link")}
                  </p>
                `;
              }

              return `
                <p class="widgetbar-card__event">
                  ${userLink}
                  <span class="widgetbar-card__text">${t("widgetbar.followedYou")}</span>
                </p>
              `;
            })
            .join("")}
        </div>
      `
    : renderWidgetbarEmptyState(
        result.failed ? t("widgetbar.loadEventsError") : t("common.emptyList"),
      );

  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">${t("widgetbar.latestEvents")}</h3>

      ${content}
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
