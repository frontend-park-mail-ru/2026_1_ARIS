/**
 * API ленты и преобразование постов в карточки интерфейса.
 *
 * Содержит:
 * - загрузку авторизованной и публичной ленты
 * - запросы популярных постов
 * - нормализацию backend-ответов в `PostcardModel`
 */
import { apiRequest } from "./core/client";
import { rememberPostLikeState, resolvePostLikeState } from "../utils/post-like-state";

export type PostcardModel = {
  /** Идентификатор поста. */
  id: string;
  /** Идентификатор автора. */
  authorId: string;
  /** Логин или username автора. */
  author: string;
  /** Имя автора. */
  firstName: string;
  /** Фамилия автора. */
  lastName: string;
  /** Ссылка на аватар автора. */
  avatar: string;
  /** Относительное время публикации для UI. */
  time: string;
  /** Исходная дата публикации для сортировки и tooltip. */
  timeRaw: string;
  /** Текст поста. */
  text: string;
  /** Количество лайков. */
  likes: number;
  /** Поставил ли текущий пользователь лайк. */
  isLiked?: boolean;
  /** Количество комментариев. */
  comments: number;
  /** Количество репостов. */
  reposts: number;
  /** Ссылки на изображения поста. */
  images: string[];
};

function parseNumericCount(value: unknown): number | undefined {
  const count =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(count) ? count : undefined;
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

type FeedRequestOptions = {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
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
  likes?: number | string;
  liked?: boolean | number | string;
  isLiked?: boolean | number | string;
  is_liked?: boolean | number | string;
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
 *
 * @param {string} [iso] Дата публикации в ISO-формате.
 * @returns {string} Относительная подпись времени.
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
 * Преобразует сырой элемент ленты с сервера в `PostcardModel`.
 *
 * @param {FeedItem} item Сырой объект поста из API.
 * @returns {PostcardModel} Нормализованная карточка для UI.
 *
 * @example
 * const card = mapFeedItemToPostcard(rawPost);
 */
export function mapFeedItemToPostcard(item: FeedItem): PostcardModel {
  const likes = parseNumericCount(item.likes) ?? 0;
  const rawIsLiked = parseBooleanFlag(item.isLiked ?? item.is_liked ?? item.liked);
  const isLiked = resolvePostLikeState(item.id ?? "", rawIsLiked);
  if (typeof rawIsLiked === "boolean" && item.id) {
    rememberPostLikeState(item.id, rawIsLiked);
  }

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
    likes,
    isLiked,
    comments: item.comments ?? 0,
    reposts: item.reposts ?? 0,
    images: Array.isArray(item.medias)
      ? item.medias.map((m) => m.mediaLink ?? "").filter(Boolean)
      : [],
  };
}

/**
 * Преобразует сырой `FeedResponse` в типизированные данные для интерфейса.
 *
 * @param {FeedResponse} [response] Ответ API ленты.
 * @returns {{ items: PostcardModel[]; nextCursor: string; hasMore: boolean }} Данные для интерфейса.
 */
export function mapFeedResponse(response?: FeedResponse) {
  return {
    items: Array.isArray(response?.posts) ? response.posts.map(mapFeedItemToPostcard) : [],
    nextCursor: response?.nextCursor ?? "",
    hasMore: Boolean(response?.hasMore),
  };
}

/**
 * GET /api/feed — лента авторизованного пользователя.
 *
 * @param {FeedRequestOptions} [options={}] Параметры пагинации и сигнал отмены.
 * @returns {Promise<FeedResponse>} Сырой ответ API ленты.
 *
 * @example
 * const response = await getFeed({ limit: 20 });
 */
export async function getFeed({
  cursor = "",
  limit = 20,
  signal,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  return apiRequest<FeedResponse>(`/api/feed?${params}`, { ...(signal ? { signal } : {}) }, {});
}

/**
 * GET /api/public/feed — публичная лента, авторизация не требуется.
 *
 * @param {FeedRequestOptions} [options={}] Параметры пагинации и сигнал отмены.
 * @returns {Promise<FeedResponse>} Сырой ответ публичной ленты.
 */
export async function getPublicFeed({
  cursor = "",
  limit = 20,
  signal,
}: FeedRequestOptions = {}): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  return apiRequest<FeedResponse>(
    `/api/public/feed?${params}`,
    { ...(signal ? { signal } : {}) },
    {},
  );
}

/**
 * GET /api/posts/popular — популярные посты для авторизованного пользователя.
 *
 * @returns {Promise<PopularPostsResponse>} Список популярных постов.
 */
export async function getPopularPosts(): Promise<PopularPostsResponse> {
  return apiRequest<PopularPostsResponse>("/api/posts/popular", {}, {});
}

/**
 * GET /api/public/popular-posts — популярные посты для гостей.
 *
 * @returns {Promise<PopularPostsResponse>} Список популярных постов.
 */
export async function getPublicPopularPosts(): Promise<PopularPostsResponse> {
  return apiRequest<PopularPostsResponse>("/api/public/popular-posts", {}, {});
}
