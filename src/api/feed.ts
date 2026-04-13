import { trackedFetch } from "../state/network-status";

export type PostcardModel = {
  id: string;
  authorId: string;
  author: string;
  firstName: string;
  lastName: string;
  avatar: string;
  time: string;
  timeRaw: string;
  text: string;
  likes: number;
  comments: number;
  reposts: number;
  images: string[];
};

type ApiError = Error & {
  status?: number;
  data?: unknown;
};

type FeedRequestOptions = {
  cursor?: string;
  limit?: number;
};

type FeedAuthor = {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarLink?: string;
};

type FeedMedia = {
  mediaLink?: string;
};

type FeedItem = {
  id?: string;
  author?: FeedAuthor;
  text?: string;
  createdAt?: string;
  likes?: number;
  comments?: number;
  reposts?: number;
  medias?: FeedMedia[];
};

type FeedResponse = {
  posts?: FeedItem[];
  nextCursor?: string;
  hasMore?: boolean;
};

type ErrorResponse = {
  error?: string;
};

type PopularPost = {
  title: string;
};

type PopularPostsResponse = {
  items?: PopularPost[];
};

/**
 * Safe JSON parsing
 */
async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return { error: text || "invalid server response" } as T;
  }
}

/**
 * GET /api/feed
 */
export async function getFeed({
  cursor = "",
  limit = 20,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();

  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  const response = await trackedFetch(`/api/feed?${params}`, {
    credentials: "include",
  });

  const data = await parseJson<FeedResponse & ErrorResponse>(response);

  if (!response.ok) {
    const error: ApiError = new Error(data.error || "failed to load feed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * GET /api/public/feed
 */
export async function getPublicFeed({
  cursor = "",
  limit = 20,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();

  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  const response = await trackedFetch(`/api/public/feed?${params}`, {
    credentials: "include",
  });

  const data = await parseJson<FeedResponse & ErrorResponse>(response);

  if (!response.ok) {
    const error: ApiError = new Error(data.error || "failed to load public feed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Relative time formatter
 */
function formatRelativeTime(iso?: string): string {
  if (!iso) return "";

  const createdAt = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  return `${days} д назад`;
}

/**
 * Map backend item → postcard model
 */
export function mapFeedItemToPostcard(item: FeedItem): PostcardModel {
  return {
    id: item.id ?? "",
    authorId: item.author?.id ?? "",
    author: item.author?.username ?? "Пользователь",
    firstName: item.author?.firstName ?? "",
    lastName: item.author?.lastName ?? "",
    avatar: item.author?.avatarLink ?? "/assets/img/default-avatar.png",
    time: formatRelativeTime(item.createdAt),
    timeRaw: item.createdAt ?? "",
    text: item.text ?? "",
    likes: item.likes ?? 0,
    comments: item.comments ?? 0,
    reposts: item.reposts ?? 0,
    images: Array.isArray(item.medias)
      ? item.medias.map((m) => m.mediaLink ?? "").filter(Boolean)
      : [],
  };
}

/**
 * Map whole response
 */
export function mapFeedResponse(response: FeedResponse) {
  return {
    items: Array.isArray(response.posts) ? response.posts.map(mapFeedItemToPostcard) : [],
    nextCursor: response.nextCursor ?? "",
    hasMore: Boolean(response.hasMore),
  };
}

/**
 * Popular posts (auth)
 */
export async function getPopularPosts(): Promise<PopularPostsResponse> {
  const response = await trackedFetch("/api/posts/popular", {
    credentials: "include",
  });

  const data = await parseJson<PopularPostsResponse & ErrorResponse>(response);

  if (!response.ok) {
    const error: ApiError = new Error(data.error || "failed to load popular posts");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Popular posts (public)
 */
export async function getPublicPopularPosts(): Promise<PopularPostsResponse> {
  const response = await trackedFetch("/api/public/popular-posts", {
    credentials: "include",
  });

  const data = await parseJson<PopularPostsResponse & ErrorResponse>(response);

  if (!response.ok) {
    const error: ApiError = new Error(data.error || "failed to load public popular posts");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
