/**
 * Модуль слоя API.
 *
 * Содержит клиентские запросы и нормализацию данных для интерфейса.
 */
/**
 * API для пользовательских подборок и событий активности.
 *
 * Содержит запросы для виджетбара:
 * - рекомендованные пользователи;
 * - популярные пользователи;
 * - последние события активности.
 */
import { apiRequest } from "./core/client";

/**
 * Пользователь в подборках виджетбара.
 */
type SuggestedUser = {
  /** Идентификатор пользователя или профиля. */
  id: string;
  /** Логин пользователя. */
  username: string;
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Ссылка на аватар, если она доступна. */
  avatarLink?: string;
};

/**
 * Пользователь из ленты последних событий с типом действия.
 */
type LatestEventUser = SuggestedUser & {
  /** Тип события, который определяет формат отображения. */
  type: number;
};

/**
 * Ответ API со списком пользователей для виджетбара.
 */
type SuggestedUsersResponse = {
  /** Набор пользователей, если сервер вернул данные успешно. */
  items?: SuggestedUser[];
};

/**
 * Ответ API со списком последних событий активности.
 */
type LatestEventsResponse = {
  /** Набор пользователей с типом события. */
  items?: LatestEventUser[];
};

/**
 * Запрашивает рекомендованных пользователей для виджета авторизованного пользователя.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<SuggestedUsersResponse>} Список рекомендованных пользователей.
 * @example
 * const data = await getSuggestedUsers();
 * const firstUser = data.items?.[0];
 */
export async function getSuggestedUsers(signal?: AbortSignal): Promise<SuggestedUsersResponse> {
  return apiRequest<SuggestedUsersResponse>(
    "/api/users/suggested",
    { ...(signal ? { signal } : {}) },
    {},
  );
}

/**
 * Запрашивает популярных пользователей для публичного виджета.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<SuggestedUsersResponse>} Список популярных пользователей.
 * @example
 * const data = await getPublicPopularUsers();
 */
export async function getPublicPopularUsers(signal?: AbortSignal): Promise<SuggestedUsersResponse> {
  return apiRequest<SuggestedUsersResponse>(
    "/api/public/popular-users",
    { ...(signal ? { signal } : {}) },
    {},
  );
}

/**
 * Запрашивает последние события активности пользователей.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<LatestEventsResponse>} Последние события активности.
 * @example
 * const events = await getLatestEvents();
 */
export async function getLatestEvents(signal?: AbortSignal): Promise<LatestEventsResponse> {
  return apiRequest<LatestEventsResponse>(
    "/api/users/latest-events",
    { ...(signal ? { signal } : {}) },
    {},
  );
}

export type { SuggestedUser, LatestEventUser, SuggestedUsersResponse, LatestEventsResponse };
