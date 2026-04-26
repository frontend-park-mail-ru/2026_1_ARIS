import { apiRequest } from "./core/client";

type SuggestedUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
};

type LatestEventUser = SuggestedUser & {
  type: number;
};

type SuggestedUsersResponse = {
  items?: SuggestedUser[];
};

type LatestEventsResponse = {
  items?: LatestEventUser[];
};

/**
 * Запрашивает рекомендованных пользователей для виджета авторизованного пользователя.
 *
 * @returns {Promise<SuggestedUsersResponse>}
 * @throws {ApiError}
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
 * @returns {Promise<SuggestedUsersResponse>}
 * @throws {ApiError}
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
 * @returns {Promise<LatestEventsResponse>}
 * @throws {ApiError}
 */
export async function getLatestEvents(signal?: AbortSignal): Promise<LatestEventsResponse> {
  return apiRequest<LatestEventsResponse>(
    "/api/users/latest-events",
    { ...(signal ? { signal } : {}) },
    {},
  );
}

export type { SuggestedUser, LatestEventUser, SuggestedUsersResponse, LatestEventsResponse };
