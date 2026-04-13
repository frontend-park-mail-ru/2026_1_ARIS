import { ApiError } from "./auth";
import type { UploadedMedia } from "./profile";
import { trackedFetch } from "../state/network-status";

type ErrorResponse = {
  error?: string;
};

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
  media?: UploadedMedia[];
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return { error: text || "invalid server response" } as T;
  }
}

function createApiError(
  fallbackMessage: string,
  status: number,
  data: ErrorResponse | unknown,
): ApiError {
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ErrorResponse).error === "string"
      ? (data as ErrorResponse).error!
      : fallbackMessage;

  return new ApiError(message, status, data);
}

async function mutatePost(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: PostPayload,
): Promise<PostResponse | void> {
  const requestInit: RequestInit = {
    method,
    credentials: "include",
  };

  if (payload && method !== "DELETE") {
    requestInit.headers = {
      "Content-Type": "application/json",
    };
    requestInit.body = JSON.stringify(payload);
  }

  const response = await trackedFetch(path, requestInit);

  const data =
    response.status === 204 || method === "DELETE"
      ? null
      : await parseJson<PostResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to mutate post", response.status, data);
  }

  return data as PostResponse | void;
}

export async function getMyPosts(): Promise<PostResponse[]> {
  const response = await trackedFetch(`/api/post/me?ts=${Date.now()}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<PostsApiResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load my posts", response.status, data);
  }

  if (Array.isArray(data)) {
    return data as PostResponse[];
  }

  return Array.isArray((data as ProfilePostsResponse).posts)
    ? ((data as ProfilePostsResponse).posts as PostResponse[])
    : [];
}

export async function getPostsByProfileId(profileId: string): Promise<PostResponse[]> {
  const response = await trackedFetch(
    `/api/post/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  const data = await parseJson<PostsApiResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load profile posts", response.status, data);
  }

  if (Array.isArray(data)) {
    return data as PostResponse[];
  }

  return Array.isArray((data as ProfilePostsResponse).posts)
    ? ((data as ProfilePostsResponse).posts as PostResponse[])
    : [];
}

export async function createPost(payload: PostPayload): Promise<PostResponse> {
  const data = await mutatePost("/api/post/upload", "POST", payload);
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
  return data as PostResponse;
}

export async function deletePost(postId: string | number): Promise<void> {
  await mutatePost(`/api/post/${encodeURIComponent(String(postId))}`, "DELETE");
}

export async function uploadPostImages(files: File[]): Promise<UploadedMedia[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await trackedFetch("/api/media/upload?for=post", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await parseJson<UploadMediaResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to upload post images", response.status, data);
  }

  return Array.isArray((data as UploadMediaResponse).media)
    ? ((data as UploadMediaResponse).media as UploadedMedia[])
    : [];
}
