import { ApiError } from "./auth";
import { trackedFetch } from "../state/network-status";

type ErrorResponse = {
  error?: string;
};

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

export async function getMyProfile(): Promise<ProfileResponse> {
  const response = await trackedFetch("/api/profile/me", {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<ProfileResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load profile", response.status, data);
  }

  return data as ProfileResponse;
}

export async function getProfileById(profileId: string): Promise<ProfileResponse> {
  const response = await trackedFetch(`/api/profile/${encodeURIComponent(profileId)}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<ProfileResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load profile", response.status, data);
  }

  return data as ProfileResponse;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<void> {
  const response = await trackedFetch("/api/profile/me/edit", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = response.status === 204 ? null : await parseJson<ErrorResponse | unknown>(response);

  if (!response.ok) {
    throw createApiError("failed to update profile", response.status, data);
  }
}
