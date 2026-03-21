/**
 * Parses JSON response body safely.
 *
 * @param {Response} response
 * @returns {Promise<Object>}
 */
async function parseJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "invalid server response" };
  }
}

/**
 * Requests authorised user feed from the backend.
 *
 * @param {Object} [options={}]
 * @param {string} [options.cursor=""]
 * @param {number} [options.limit=20]
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function getFeed({ cursor = "", limit = 20 } = {}) {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const url = `/api/feed${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "failed to load feed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Requests public feed from the backend.
 *
 * @param {Object} [options={}]
 * @param {string} [options.cursor=""]
 * @param {number} [options.limit=20]
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function getPublicFeed({ cursor = "", limit = 20 } = {}) {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const url = `/api/public/feed${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "failed to load public feed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Formats ISO date string into relative time.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatRelativeTime(isoString) {
  const createdAt = new Date(isoString);
  const now = new Date();
  const diffMs = now - createdAt;

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  return `${diffDays} д назад`;
}

/**
 * Maps backend feed item to postcard view model.
 *
 * @param {Object} item
 * @returns {Object}
 */
export function mapFeedItemToPostcard(item) {
  return {
    id: item?.id || "",
    authorId: item?.author?.id || "",
    author: item?.author?.username || "Пользователь",
    firstName: item?.author?.firstName || "",
    lastName: item?.author?.lastName || "",
    avatar: item?.author?.avatarLink || "/assets/img/default-avatar.png",
    time: formatRelativeTime(item?.createdAt),
    timeRaw: item?.createdAt || "",
    text: item?.text || "",
    likes: item?.likes || 0,
    comments: item?.comments || 0,
    reposts: item?.reposts || 0,
    images: Array.isArray(item?.medias)
      ? item.medias.map((media) => media.mediaLink).filter(Boolean)
      : [],
  };
}

/**
 * Maps backend feed response to frontend feed model.
 *
 * @param {Object} response
 * @returns {Object}
 */
export function mapFeedResponse(response) {
  return {
    items: Array.isArray(response?.posts) ? response.posts.map(mapFeedItemToPostcard) : [],
    nextCursor: response?.nextCursor || "",
    hasMore: Boolean(response?.hasMore),
  };
}

/**
 * Requests popular posts for authorised user widget.
 *
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function getPopularPosts() {
  const response = await fetch("/api/posts/popular", {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "failed to load popular posts");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Requests popular posts for public widget.
 *
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function getPublicPopularPosts() {
  const response = await fetch("/api/public/popular-posts", {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "failed to load public popular posts");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
