/**
 * Глобальное состояние языка интерфейса.
 */
import type { LanguageMode, UserSettingsResponse } from "../api/settings";
import { StateManager } from "./StateManager";

export { type LanguageMode };

type LanguageState = {
  language: LanguageMode;
};

type LanguageChangeDetail = {
  language: LanguageMode;
  state: LanguageState;
};

const LANGUAGE_STORAGE_KEY = "arisfront:language";

export const languageStore = new StateManager<LanguageState>({
  language: "RU",
});

function isLanguageMode(value: unknown): value is LanguageMode {
  return value === "RU" || value === "EN";
}

function readPersistedLanguage(): LanguageMode | null {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageMode(value) ? value : null;
  } catch {
    return null;
  }
}

function persistLanguage(language: LanguageMode): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Хранилище может быть недоступно в приватном режиме или тестовой среде.
  }
}

function emitLanguageChange(language: LanguageMode): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<LanguageChangeDetail>("languagechange", {
      detail: { language, state: languageStore.get() as LanguageState },
    }),
  );
}

export function normaliseLanguageFromSettings(settings: UserSettingsResponse): LanguageMode | null {
  return isLanguageMode(settings.language) ? settings.language : null;
}

/**
 * Возвращает текущий язык интерфейса.
 */
export function getLanguageMode(): LanguageMode {
  return languageStore.get().language;
}

/**
 * Применяет язык к состоянию и локальному кэшу.
 */
export function applyLanguage(
  language: LanguageMode,
  options: { persist?: boolean; emit?: boolean } = {},
): void {
  const { persist = true, emit = true } = options;
  languageStore.patch({ language });

  if (persist) {
    persistLanguage(language);
  }

  if (emit) {
    emitLanguageChange(language);
  }
}

/**
 * Применяет сохранённый локально язык до серверной синхронизации.
 */
export function initLanguageFromStorage(): void {
  applyLanguage(readPersistedLanguage() ?? "RU", { emit: false });
}

/**
 * Сохраняет язык на сервере и применяет ответ backend.
 */
export async function saveLanguageToServer(
  language: LanguageMode,
  signal?: AbortSignal,
): Promise<UserSettingsResponse> {
  const { updateUserSettings } = await import("../api/settings");
  const settings = await updateUserSettings({ language }, signal);
  applyLanguage(normaliseLanguageFromSettings(settings) ?? language);
  return settings;
}
