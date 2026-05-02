/**
 * API для работы с постами.
 *
 * Содержит:
 * - загрузку своих и чужих постов;
 * - создание, редактирование и удаление;
 * - загрузку изображений для публикаций;
 * - офлайн-очередь через outbox при проблемах сети.
 */
import { ApiError, apiRequest } from "./core/client";
import type { UploadedMedia } from "./profile";
import { isNetworkUnavailableError } from "../state/network-status";
import { clearFeedCache } from "../pages/feed/cache";
import { enqueueRequest, OutboxQueuedError, registerOutboxSync } from "../utils/outbox-idb";

// Повторно экспортируем `ApiError`, чтобы сохранить текущие импорты в других модулях.
export { ApiError };

/**
 * Тело запроса на создание или обновление поста.
 */
export type PostPayload = {
  /** Текст публикации. */
  text?: string;
  /** Загруженные медиафайлы, привязываемые к посту. */
  media?: UploadedMedia[];
  /** Идентификатор профиля, от имени которого создаётся публикация. */
  authorProfileId?: number;
};

/**
 * Медиавложение поста в клиентском формате.
 */
export type PostMedia = {
  /** Идентификатор медиафайла. */
  mediaID: number;
  /** Ссылка на изображение. */
  mediaURL: string;
};

/**
 * Пост в ответах API.
 */
export type PostResponse = {
  /** Идентификатор поста. */
  id: number;
  /** Идентификатор профиля автора. */
  profileID: number;
  /** Нормализованные медиавложения поста. */
  media?: PostMedia[];
  /** Устаревшее поле backend со списком ссылок на медиа. */
  mediaURL?: string[];
  /** Текст публикации. */
  text?: string;
  /** Имя автора. */
  firstName?: string;
  /** Фамилия автора. */
  lastName?: string;
  /** Идентификатор учётной записи автора. */
  userAccountID?: number;
  /** Ссылка на аватар автора. */
  avatarURL?: string;
  /** Дата создания в формате ISO. */
  createdAt?: string;
  /** Дата обновления в формате ISO. */
  updatedAt?: string;
  /** Количество лайков. */
  likes?: number;
  /** Признак лайка текущего пользователя. */
  isLiked?: boolean;
};

type ProfilePostsResponse = {
  posts?: PostResponse[];
};

type PostsApiResponse = ProfilePostsResponse | PostResponse[];

type UploadedMediaPayload =
  | UploadedMedia
  | {
      mediaID?: number | string;
      mediaId?: number | string;
      media_id?: number | string;
      mediaURL?: string;
      mediaUrl?: string;
      media_url?: string;
      url?: string;
    };

type UploadMediaResponse = {
  media?: UploadedMediaPayload[];
};

function mapUploadedMedia(raw: UploadedMediaPayload | null | undefined): UploadedMedia | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const mediaID = Number(
    raw.mediaID ??
      ("mediaId" in raw ? raw.mediaId : undefined) ??
      ("media_id" in raw ? raw.media_id : undefined),
  );
  const mediaURL = String(
    raw.mediaURL ??
      ("mediaUrl" in raw ? raw.mediaUrl : undefined) ??
      ("media_url" in raw ? raw.media_url : undefined) ??
      ("url" in raw ? raw.url : undefined) ??
      "",
  ).trim();

  if (!Number.isFinite(mediaID) || mediaID <= 0 || !mediaURL) {
    return null;
  }

  return { mediaID, mediaURL };
}

async function mutatePost(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: PostPayload,
): Promise<PostResponse | void> {
  try {
    const data = await apiRequest<PostResponse | null>(
      path,
      {
        method,
        ...(payload && method !== "DELETE" ? { body: payload } : {}),
      },
      null,
    );
    return data ?? undefined;
  } catch (error) {
    if (!isNetworkUnavailableError(error)) {
      throw error;
    }

    const body = payload && method !== "DELETE" ? JSON.stringify(payload) : undefined;
    await enqueueRequest({
      url: path,
      method,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body,
          }
        : {}),
    });
    await registerOutboxSync().catch((syncError: unknown) => {
      console.warn("[outbox] background sync registration failed", syncError);
    });
    clearFeedCache();
    // При офлайн-ошибке ставим запрос в outbox, чтобы пользователь
    // не потерял действие и смог продолжить работу без сети.
    throw new OutboxQueuedError();
  }
}

/**
 * Загружает посты текущего пользователя.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<PostResponse[]>} Список постов собственного профиля.
 * @example
 * const posts = await getMyPosts();
 */
export async function getMyPosts(signal?: AbortSignal): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/me?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  if (Array.isArray(data)) {
    return data as PostResponse[];
  }

  return Array.isArray((data as ProfilePostsResponse).posts)
    ? ((data as ProfilePostsResponse).posts as PostResponse[])
    : [];
}

/**
 * Загружает посты выбранного профиля.
 *
 * @param {string} profileId Идентификатор профиля.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<PostResponse[]>} Список постов выбранного профиля.
 * @example
 * const posts = await getPostsByProfileId("7");
 */
export async function getPostsByProfileId(
  profileId: string,
  signal?: AbortSignal,
): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  if (Array.isArray(data)) {
    return data as PostResponse[];
  }

  return Array.isArray((data as ProfilePostsResponse).posts)
    ? ((data as ProfilePostsResponse).posts as PostResponse[])
    : [];
}

/**
 * Создаёт новый пост.
 *
 * После успешной отправки очищает кэш ленты, потому что новая публикация
 * должна появиться в актуальных списках без ручного обновления страницы.
 *
 * @param {PostPayload} payload Данные новой публикации.
 * @returns {Promise<PostResponse>} Созданный пост.
 * @example
 * const post = await createPost({ text: "Новая запись" });
 */
export async function createPost(payload: PostPayload): Promise<PostResponse> {
  const data = await mutatePost("/api/post/upload", "POST", payload);
  clearFeedCache();
  return data as PostResponse;
}

/**
 * Обновляет существующий пост.
 *
 * @param {string | number} postId Идентификатор поста.
 * @param {PostPayload} payload Новое содержимое поста.
 * @returns {Promise<PostResponse>} Обновлённый пост.
 * @example
 * await updatePost(5, { text: "Обновлённый текст" });
 */
export async function updatePost(
  postId: string | number,
  payload: PostPayload,
): Promise<PostResponse> {
  const data = await mutatePost(
    `/api/post/${encodeURIComponent(String(postId))}`,
    "PATCH",
    payload,
  );
  clearFeedCache();
  return data as PostResponse;
}

/**
 * Удаляет пост по идентификатору.
 *
 * @param {string | number} postId Идентификатор удаляемого поста.
 * @returns {Promise<void>}
 * @example
 * await deletePost(5);
 */
export async function deletePost(postId: string | number): Promise<void> {
  await mutatePost(`/api/post/${encodeURIComponent(String(postId))}`, "DELETE");
  clearFeedCache();
}

/**
 * Загружает изображения для поста в медиахранилище.
 *
 * Используется до создания или редактирования поста, чтобы получить
 * устойчивые `mediaID`, которые потом можно передать в `PostPayload`.
 *
 * @param {File[]} files Список изображений для загрузки.
 * @returns {Promise<UploadedMedia[]>} Загруженные файлы с идентификаторами и ссылками.
 * @example
 * const uploaded = await uploadPostImages(files);
 */
export async function uploadPostImages(files: File[]): Promise<UploadedMedia[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=post",
    { method: "POST", body: formData },
    {},
  );
  const uploadedMedia = Array.isArray(data.media) ? data.media : [];

  return uploadedMedia
    .map((item) => mapUploadedMedia(item))
    .filter((item): item is UploadedMedia => Boolean(item));
}
