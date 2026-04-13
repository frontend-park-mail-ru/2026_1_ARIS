import { trackedFetch } from "../state/network-status";

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

type ApiError = Error & {
  status?: number;
  data?: unknown;
};

/**
 * Safely parses JSON response body.
 *
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "invalid server response" };
  }
}

/**
 * Builds API error with extra fields.
 *
 * @param {string} message
 * @param {number} status
 * @param {unknown} data
 * @returns {ApiError}
 */
function createApiError(message: string, status: number, data: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.data = data;
  return error;
}

/**
 * Requests suggested users for the authorised user widget.
 *
 * @returns {Promise<SuggestedUsersResponse>}
 * @throws {ApiError}
 */
export async function getSuggestedUsers(): Promise<SuggestedUsersResponse> {
  const response = await trackedFetch("/api/users/suggested", {
    credentials: "include",
  });

  const data = (await parseJson(response)) as SuggestedUsersResponse & { error?: string };

  if (!response.ok) {
    throw createApiError(data.error || "failed to load users", response.status, data);
  }

  return data;
}

/**
 * Requests popular users for the public widget.
 *
 * @returns {Promise<SuggestedUsersResponse>}
 * @throws {ApiError}
 */
export async function getPublicPopularUsers(): Promise<SuggestedUsersResponse> {
  const response = await trackedFetch("/api/public/popular-users", {
    credentials: "include",
  });

  const data = (await parseJson(response)) as SuggestedUsersResponse & { error?: string };

  if (!response.ok) {
    throw createApiError(data.error || "failed to load popular users", response.status, data);
  }

  return data;
}

/**
 * Requests latest user activity events.
 *
 * @returns {Promise<LatestEventsResponse>}
 * @throws {ApiError}
 */
export async function getLatestEvents(): Promise<LatestEventsResponse> {
  const response = await trackedFetch("/api/users/latest-events", {
    credentials: "include",
  });

  const data = (await parseJson(response)) as LatestEventsResponse & { error?: string };

  if (!response.ok) {
    throw createApiError(data.error || "failed to load latest events", response.status, data);
  }

  return data;
}

export type { SuggestedUser, LatestEventUser, SuggestedUsersResponse, LatestEventsResponse };
