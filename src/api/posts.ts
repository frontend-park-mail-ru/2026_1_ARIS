import { ApiError, apiRequest } from "./core/client";
import type { UploadedMedia } from "./profile";
import { isNetworkUnavailableError } from "../state/network-status";
import { clearFeedCache } from "../pages/feed/cache";
import { enqueueRequest, OutboxQueuedError, registerOutboxSync } from "../utils/outbox-idb";

// Повторно экспортируем ApiError для кода, который импортирует его из этого модуля.
export { ApiError };

export type PostPayload = {
  text?: string;
  media?: UploadedMedia[];
};

export type PostMedia = {
  mediaID: number;
  mediaURL: string;
};

export type PostResponse = {
  id: number;
  profileID: number;
  media?: PostMedia[];
  mediaURL?: string[];
  text?: string;
  firstName?: string;
  lastName?: string;
  userAccountID?: number;
  avatarURL?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProfilePostsResponse = {
  posts?: PostResponse[];
};

type PostsApiResponse = ProfilePostsResponse | PostResponse[];

type UploadMediaResponse = {
  media?: Array<
    | UploadedMedia
    | {
        mediaID?: number | string;
        mediaId?: number | string;
        media_id?: number | string;
        mediaURL?: string;
        mediaUrl?: string;
        media_url?: string;
        url?: string;
      }
  >;
};

function mapUploadedMedia(
  raw: UploadMediaResponse["media"] extends Array<infer T> ? T : never,
): UploadedMedia | null {
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
    throw new OutboxQueuedError();
  }
}

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

export async function uploadPostImages(files: File[]): Promise<UploadedMedia[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=post",
    { method: "POST", body: formData },
    {},
  );

  return Array.isArray((data as UploadMediaResponse).media)
    ? (data as UploadMediaResponse).media
        .map((item) => mapUploadedMedia(item))
        .filter((item): item is UploadedMedia => Boolean(item))
    : [];
}
