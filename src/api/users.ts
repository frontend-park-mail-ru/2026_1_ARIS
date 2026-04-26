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
export async function getSuggestedUsers(): Promise<SuggestedUsersResponse> {
  return apiRequest<SuggestedUsersResponse>("/api/users/suggested", {}, {});
}

/**
 * Запрашивает популярных пользователей для публичного виджета.
 *
 * @returns {Promise<SuggestedUsersResponse>}
 * @throws {ApiError}
 */
export async function getPublicPopularUsers(): Promise<SuggestedUsersResponse> {
  return apiRequest<SuggestedUsersResponse>("/api/public/popular-users", {}, {});
}

/**
 * Запрашивает последние события активности пользователей.
 *
 * @returns {Promise<LatestEventsResponse>}
 * @throws {ApiError}
 */
export async function getLatestEvents(): Promise<LatestEventsResponse> {
  return apiRequest<LatestEventsResponse>("/api/users/latest-events", {}, {});
}

export type { SuggestedUser, LatestEventUser, SuggestedUsersResponse, LatestEventsResponse };
