const API_BASE_URL = "http://localhost:8080";

async function parseJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "invalid server response" };
  }
}

export async function getFeed({ cursor = "", limit = 20 } = {}) {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/api/public/feed${query ? `?${query}` : ""}`;

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

export function mapFeedItemToPostcard(item) {
  return {
    author: item?.Author?.Username || "Пользователь",
    time: formatRelativeTime(item?.CreatedAt),
    text: item?.Text || "",
    likes: item?.Likes || 0,
    comments: item?.Comments || 0,
    reposts: 0,
    images: Array.isArray(item?.Medias)
      ? item.Medias.map((media) => media.Link).filter(Boolean)
      : [],
  };
}

export function mapFeedResponse(response) {
  return {
    items: Array.isArray(response?.Items) ? response.Items.map(mapFeedItemToPostcard) : [],
    nextCursor: response?.NextCursor || "",
    hasNext: Boolean(response?.HasNext),
  };
}
