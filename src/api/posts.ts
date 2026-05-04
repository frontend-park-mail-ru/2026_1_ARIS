/**
 * API для работы с постами.
 *
 * Содержит:
 * - загрузку своих и чужих постов;
 * - загрузку постов сообщества;
 * - создание, редактирование и удаление;
 * - загрузку изображений для публикаций;
 * - офлайн-очередь через outbox при проблемах сети.
 */
import { ApiError, apiRequest } from "./core/client";
import type { UploadedMedia } from "./profile";
import { isNetworkUnavailableError } from "../state/network-status";
import { clearFeedCache } from "../pages/feed/cache";
import { enqueueRequest, OutboxQueuedError, registerOutboxSync } from "../utils/outbox-idb";
import { rememberPostLikeState, resolvePostLikeState } from "../utils/post-like-state";

export { ApiError };

export type PostPayload = {
  text?: string;
  media?: UploadedMedia[];
  authorProfileId?: number;
  communityId?: number;
};

export type PostMedia = {
  mediaID: number;
  mediaURL: string;
};

export type PostAuthor = {
  profileID: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  userAccountID?: number;
  avatarURL?: string;
};

export type PostResponse = {
  id: number;
  profileID: number;
  communityId?: number;
  media?: PostMedia[];
  mediaURL?: string[];
  text?: string;
  firstName?: string;
  lastName?: string;
  userAccountID?: number;
  avatarURL?: string;
  author?: PostAuthor;
  createdAt?: string;
  updatedAt?: string;
  likes?: number;
  isLiked?: boolean;
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

type RawPostMedia = {
  mediaID?: number | string;
  mediaId?: number | string;
  media_id?: number | string;
  mediaURL?: string;
  mediaUrl?: string;
  media_url?: string;
  url?: string;
};

type RawPostAuthor = {
  profileID?: number | string;
  profileId?: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  userAccountID?: number | string;
  userAccountId?: number | string;
  avatarURL?: string | null;
  avatarUrl?: string | null;
};

type RawPost = {
  id?: number | string;
  ID?: number | string;
  profileID?: number | string;
  profileId?: number | string;
  communityId?: number | string | null;
  media?: RawPostMedia[];
  mediaURL?: string[];
  mediaUrl?: string[];
  text?: string | null;
  firstName?: string;
  lastName?: string;
  userAccountID?: number | string;
  userAccountId?: number | string;
  avatarURL?: string | null;
  avatarUrl?: string | null;
  author?: RawPostAuthor;
  createdAt?: string;
  updatedAt?: string | null;
  likes?: number | string;
  liked?: boolean | number | string;
  isLiked?: boolean | number | string;
  is_liked?: boolean | number | string;
};

type ProfilePostsResponse = {
  posts?: RawPost[];
};

type PostsApiResponse = ProfilePostsResponse | RawPost[];

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

function mapPostMedia(raw: RawPostMedia | null | undefined): PostMedia | null {
  return mapUploadedMedia(raw);
}

function mapPostAuthor(raw: RawPostAuthor | null | undefined): PostAuthor | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const profileID = Number(raw.profileID ?? raw.profileId ?? 0);
  if (!Number.isFinite(profileID) || profileID <= 0) {
    return undefined;
  }

  return {
    profileID,
    ...(raw.firstName ? { firstName: String(raw.firstName) } : {}),
    ...(raw.lastName ? { lastName: String(raw.lastName) } : {}),
    ...(raw.username ? { username: String(raw.username) } : {}),
    ...(Number(raw.userAccountID ?? raw.userAccountId ?? 0) > 0
      ? { userAccountID: Number(raw.userAccountID ?? raw.userAccountId) }
      : {}),
    ...((raw.avatarURL ?? raw.avatarUrl)
      ? { avatarURL: String(raw.avatarURL ?? raw.avatarUrl) }
      : {}),
  };
}

function mapPost(raw: RawPost): PostResponse {
  const author = mapPostAuthor(raw.author);
  const media = Array.isArray(raw.media)
    ? raw.media.map((item) => mapPostMedia(item)).filter((item): item is PostMedia => Boolean(item))
    : [];
  const legacyMediaUrls = Array.isArray(raw.mediaURL)
    ? raw.mediaURL
    : Array.isArray(raw.mediaUrl)
      ? raw.mediaUrl
      : [];
  const communityId = Number(raw.communityId);
  const likes = parseNumericCount(raw.likes);
  const rawIsLiked = parseBooleanFlag(raw.isLiked ?? raw.is_liked ?? raw.liked);
  const resolvedPostId = Number(raw.id ?? raw.ID ?? 0);
  const isLiked = resolvePostLikeState(resolvedPostId, rawIsLiked);
  if (typeof rawIsLiked === "boolean" && resolvedPostId > 0) {
    rememberPostLikeState(resolvedPostId, rawIsLiked);
  }

  return {
    id: resolvedPostId,
    profileID: Number(raw.profileID ?? raw.profileId ?? author?.profileID ?? 0),
    ...(Number.isFinite(communityId) && communityId > 0 ? { communityId } : {}),
    ...(media.length ? { media } : {}),
    ...(legacyMediaUrls.length ? { mediaURL: legacyMediaUrls.filter(Boolean) } : {}),
    ...(typeof raw.text === "string" ? { text: raw.text } : {}),
    ...(raw.firstName || author?.firstName
      ? { firstName: String(raw.firstName ?? author?.firstName ?? "") }
      : {}),
    ...(raw.lastName || author?.lastName
      ? { lastName: String(raw.lastName ?? author?.lastName ?? "") }
      : {}),
    ...(Number(raw.userAccountID ?? raw.userAccountId ?? author?.userAccountID ?? 0) > 0
      ? { userAccountID: Number(raw.userAccountID ?? raw.userAccountId ?? author?.userAccountID) }
      : {}),
    ...((raw.avatarURL ?? raw.avatarUrl ?? author?.avatarURL)
      ? { avatarURL: String(raw.avatarURL ?? raw.avatarUrl ?? author?.avatarURL ?? "") }
      : {}),
    ...(author ? { author } : {}),
    ...(raw.createdAt ? { createdAt: String(raw.createdAt) } : {}),
    ...(raw.updatedAt ? { updatedAt: String(raw.updatedAt) } : {}),
    ...(typeof likes === "number" ? { likes } : {}),
    ...(typeof isLiked === "boolean" ? { isLiked } : {}),
  };
}

function mapPostsApiResponse(data: PostsApiResponse): PostResponse[] {
  if (Array.isArray(data)) {
    return data.map(mapPost).filter((post) => post.id > 0);
  }

  return Array.isArray(data.posts) ? data.posts.map(mapPost).filter((post) => post.id > 0) : [];
}

async function mutatePost(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: PostPayload,
): Promise<PostResponse | void> {
  try {
    const data = await apiRequest<RawPost | null>(
      path,
      {
        method,
        ...(payload && method !== "DELETE" ? { body: payload } : {}),
      },
      null,
    );
    return data ? mapPost(data) : undefined;
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
    throw new OutboxQueuedError();
  }
}

export async function getMyPosts(signal?: AbortSignal): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/me?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return mapPostsApiResponse(data);
}

export async function getPostsByProfileId(
  profileId: string,
  signal?: AbortSignal,
): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return mapPostsApiResponse(data);
}

export async function getPostsByCommunityId(
  communityId: string | number,
  signal?: AbortSignal,
): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/community/${encodeURIComponent(String(communityId))}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return mapPostsApiResponse(data);
}

export async function getOfficialCommunityPosts(
  communityId: string | number,
  signal?: AbortSignal,
): Promise<PostResponse[]> {
  const data = await apiRequest<PostsApiResponse>(
    `/api/post/community/${encodeURIComponent(String(communityId))}/official?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return mapPostsApiResponse(data);
}

export async function getPostById(
  postId: string | number,
  signal?: AbortSignal,
): Promise<PostResponse> {
  const data = await apiRequest<RawPost | null>(
    `/api/post/${encodeURIComponent(String(postId))}`,
    { ...(signal ? { signal } : {}) },
    null,
  );

  if (!data) {
    throw new Error("Не удалось загрузить публикацию.");
  }

  return mapPost(data);
}

export async function createPost(payload: PostPayload): Promise<PostResponse> {
  const data = await mutatePost("/api/post/upload", "POST", payload);
  clearFeedCache();
  return data as PostResponse;
}

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

export async function deletePost(postId: string | number): Promise<void> {
  await mutatePost(`/api/post/${encodeURIComponent(String(postId))}`, "DELETE");
  clearFeedCache();
}

export async function likePost(postId: string | number): Promise<PostResponse> {
  const data = await apiRequest<RawPost | null>(
    `/api/post/${encodeURIComponent(String(postId))}/likes`,
    { method: "POST" },
    null,
  );
  if (!data) throw new Error("Не удалось поставить лайк.");
  const mapped = mapPost(data);
  rememberPostLikeState(postId, mapped.isLiked ?? true);
  return mapped;
}

export async function unlikePost(postId: string | number): Promise<PostResponse> {
  const data = await apiRequest<RawPost | null>(
    `/api/post/${encodeURIComponent(String(postId))}/likes`,
    { method: "DELETE" },
    null,
  );
  if (!data) throw new Error("Не удалось убрать лайк.");
  const mapped = mapPost(data);
  rememberPostLikeState(postId, mapped.isLiked ?? false);
  return mapped;
}

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
