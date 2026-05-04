/**
 * Общая синхронизация пользовательских настроек.
 */
import { getUserSettings, type UserSettingsResponse } from "../api/settings";
import { applyLanguage, getLanguageMode, normaliseLanguageFromSettings } from "./language";
import { applyTheme, getThemeMode, normaliseThemeFromSettings } from "./theme";

let hasSyncedUserSettings = false;

/**
 * Применяет ответ backend к локальному состоянию настроек.
 */
export function applyUserSettings(settings: UserSettingsResponse): void {
  applyTheme(normaliseThemeFromSettings(settings) ?? getThemeMode());
  applyLanguage(normaliseLanguageFromSettings(settings) ?? getLanguageMode());
}

/**
 * Возвращает текущие настройки из локального состояния.
 */
export function getCurrentUserSettings(): UserSettingsResponse {
  return {
    language: getLanguageMode(),
    theme: getThemeMode(),
  };
}

/**
 * Сбрасывает признак актуальной серверной синхронизации.
 */
export function resetUserSettingsSyncState(): void {
  hasSyncedUserSettings = false;
}

/**
 * Синхронизирует тему и язык с серверными настройками пользователя одним запросом.
 */
export async function syncUserSettingsWithServer(
  signal?: AbortSignal,
  options: { force?: boolean } = {},
): Promise<UserSettingsResponse> {
  if (hasSyncedUserSettings && !options.force) {
    return getCurrentUserSettings();
  }

  const settings = await getUserSettings(signal);
  applyUserSettings(settings);
  hasSyncedUserSettings = true;
  return settings;
}
