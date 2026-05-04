/**
 * API пользовательских настроек.
 */
import { apiRequest } from "./core/client";

export type ThemeMode = "light" | "dark";
export type LanguageMode = "RU" | "EN";

export type UserSettingsResponse = {
  userAccountID?: number;
  language?: LanguageMode;
  theme?: ThemeMode;
};

export type UpdateUserSettingsPayload = {
  theme?: ThemeMode;
};

/**
 * Загружает настройки текущего авторизованного пользователя.
 */
export async function getUserSettings(signal?: AbortSignal): Promise<UserSettingsResponse> {
  return apiRequest<UserSettingsResponse>("/api/settings/", { ...(signal ? { signal } : {}) }, {});
}

/**
 * Обновляет настройки текущего авторизованного пользователя.
 */
export async function updateUserSettings(
  payload: UpdateUserSettingsPayload,
  signal?: AbortSignal,
): Promise<UserSettingsResponse> {
  return apiRequest<UserSettingsResponse>(
    "/api/settings/",
    { method: "POST", body: payload, ...(signal ? { signal } : {}) },
    {},
  );
}
