import { ApiError, parseJson, createApiError, apiRequest } from "./core/client";
import { trackedFetch } from "../state/network-status";

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
  media?: UploadedMedia[];
};

export async function getMyProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(`/api/profile/me?ts=${Date.now()}`, {}, {} as ProfileResponse);
}

export async function getProfileById(profileId: string): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    `/api/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    {},
    {} as ProfileResponse,
  );
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<void> {
  const response = await trackedFetch("/api/profile/me/edit", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data =
    response.status === 204 ? null : await parseJson<{ error?: string } | unknown>(response, {});

  if (!response.ok) {
    throw createApiError("failed to update profile", response.status, data);
  }
}

export async function uploadProfileAvatar(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("files", file);

  const response = await trackedFetch("/api/media/upload?for=avatar", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await parseJson<UploadMediaResponse | { error?: string }>(response, {});

  if (!response.ok) {
    throw createApiError("failed to upload avatar", response.status, data);
  }

  const uploadedFile = Array.isArray((data as UploadMediaResponse).media)
    ? (data as UploadMediaResponse).media?.[0]
    : null;

  if (!uploadedFile) {
    throw new ApiError("failed to upload avatar", response.status, data);
  }

  return uploadedFile;
}
