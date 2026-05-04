/**
 * Глобальное состояние темы оформления.
 */
import {
  getUserSettings,
  updateUserSettings,
  type ThemeMode,
  type UserSettingsResponse,
} from "../api/settings";
import { StateManager } from "./StateManager";

export { type ThemeMode };

type ThemeState = {
  theme: ThemeMode;
};

type ThemeChangeDetail = {
  theme: ThemeMode;
  state: ThemeState;
};

const THEME_STORAGE_KEY = "arisfront:theme";
const THEME_META_COLORS: Record<ThemeMode, string> = {
  light: "#4c6fff",
  dark: "#10182f",
};

export const themeStore = new StateManager<ThemeState>({
  theme: "light",
});

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readPersistedTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Хранилище может быть недоступно в приватном режиме или тестовой среде.
  }
}

function syncThemeMeta(theme: ThemeMode): void {
  if (typeof document === "undefined") return;

  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!(meta instanceof HTMLMetaElement)) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.append(meta);
  }

  meta.setAttribute("content", THEME_META_COLORS[theme]);
}

function emitThemeChange(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ThemeChangeDetail>("themechange", {
      detail: { theme, state: themeStore.get() as ThemeState },
    }),
  );
}

function normaliseThemeFromSettings(settings: UserSettingsResponse): ThemeMode | null {
  return isThemeMode(settings.theme) ? settings.theme : null;
}

/**
 * Возвращает текущую тему оформления.
 */
export function getThemeMode(): ThemeMode {
  return themeStore.get().theme;
}

/**
 * Применяет тему к DOM, состоянию и локальному кэшу.
 */
export function applyTheme(
  theme: ThemeMode,
  options: { persist?: boolean; emit?: boolean } = {},
): void {
  const { persist = true, emit = true } = options;
  themeStore.patch({ theme });

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }

  syncThemeMeta(theme);

  if (persist) {
    persistTheme(theme);
  }

  if (emit) {
    emitThemeChange(theme);
  }
}

/**
 * Применяет сохранённую локально тему до серверной синхронизации.
 */
export function initThemeFromStorage(): void {
  applyTheme(readPersistedTheme() ?? "light", { emit: false });
}

/**
 * Синхронизирует локальную тему с серверной настройкой пользователя.
 */
export async function syncThemeWithServer(signal?: AbortSignal): Promise<ThemeMode> {
  const settings = await getUserSettings(signal);
  const theme = normaliseThemeFromSettings(settings) ?? getThemeMode();
  applyTheme(theme);
  return theme;
}

/**
 * Сохраняет тему на сервере и применяет ответ backend.
 */
export async function saveThemeToServer(
  theme: ThemeMode,
  signal?: AbortSignal,
): Promise<UserSettingsResponse> {
  const settings = await updateUserSettings({ theme }, signal);
  applyTheme(normaliseThemeFromSettings(settings) ?? theme);
  return settings;
}
