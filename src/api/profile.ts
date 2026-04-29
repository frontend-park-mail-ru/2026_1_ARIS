import { ApiError, apiRequest } from "./core/client";

// Повторно экспортируем ApiError для кода, который импортирует его из этого модуля.
export { ApiError };

export type ProfileEducation = {
  institution?: string;
  grade?: string;
};

export type ProfileWork = {
  company?: string;
  jobTitle?: string;
};

export type ProfileResponse = {
  firstName: string;
  lastName: string;
  bio?: string;
  imageLink?: string;
  gender?: string;
  birthday?: string;
  dirthday?: string;
  birthdayDate?: string;
  nativeTown?: string;
  phone?: string;
  email?: string;
  town?: string;
  education?: ProfileEducation[];
  work?: ProfileWork[];
  interests?: string;
  favMusic?: string;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarID?: number;
  removeAvatar?: boolean;
  birthdayDate?: string;
  gender?: "male" | "female";
  nativeTown?: string;
  town?: string;
  phone?: string;
  email?: string;
  institution?: string;
  group?: string;
  company?: string;
  jobTitle?: string;
  interests?: string;
  favMusic?: string;
};

export type UploadedMedia = {
  mediaID: number;
  mediaURL: string;
};

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

export async function getMyProfile(signal?: AbortSignal): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    `/api/profile/me?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {} as ProfileResponse,
  );
}

export async function getProfileById(
  profileId: string,
  signal?: AbortSignal,
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    `/api/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {} as ProfileResponse,
  );
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<void> {
  await apiRequest<unknown>("/api/profile/me/edit", { method: "PATCH", body: payload }, null);
}

export async function uploadProfileAvatar(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("files", file);

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=avatar",
    { method: "POST", body: formData },
    {},
  );

  const uploadedFile = Array.isArray((data as UploadMediaResponse).media)
    ? mapUploadedMedia((data as UploadMediaResponse).media?.[0])
    : null;

  if (!uploadedFile) {
    throw new ApiError("failed to upload avatar", 200, data);
  }

  return uploadedFile;
}
