import { apiRequest } from "./core/client";

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

type PopularPost = {
  title: string;
};

type PopularPostsResponse = {
  items?: PopularPost[];
};

/**
 * Форматирует ISO-дату в относительную временную метку на русском языке.
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
 * Преобразует сырой элемент ленты из backend в PostcardModel.
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
 * Преобразует сырой FeedResponse в типизированные данные для UI.
 */
export function mapFeedResponse(response: FeedResponse) {
  return {
    items: Array.isArray(response.posts) ? response.posts.map(mapFeedItemToPostcard) : [],
    nextCursor: response.nextCursor ?? "",
    hasMore: Boolean(response.hasMore),
  };
}

/**
 * GET /api/feed — лента авторизованного пользователя.
 */
export async function getFeed({
  cursor = "",
  limit = 20,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  return apiRequest<FeedResponse>(`/api/feed?${params}`, {}, {});
}

/**
 * GET /api/public/feed — публичная лента, авторизация не требуется.
 */
export async function getPublicFeed({
  cursor = "",
  limit = 20,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  return apiRequest<FeedResponse>(`/api/public/feed?${params}`, {}, {});
}

/**
 * GET /api/posts/popular — популярные посты для авторизованного пользователя.
 */
export async function getPopularPosts(): Promise<PopularPostsResponse> {
  return apiRequest<PopularPostsResponse>("/api/posts/popular", {}, {});
}

/**
 * GET /api/public/popular-posts — популярные посты для гостей.
 */
export async function getPublicPopularPosts(): Promise<PopularPostsResponse> {
  return apiRequest<PopularPostsResponse>("/api/public/popular-posts", {}, {});
}
