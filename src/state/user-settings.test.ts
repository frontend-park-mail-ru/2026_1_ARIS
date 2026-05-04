/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserSettings } from "../api/settings";
import { createMemoryStorage } from "../test-utils/storage";
import { getLanguageMode, languageStore } from "./language";
import { getThemeMode, themeStore } from "./theme";
import {
  applyUserSettings,
  getCurrentUserSettings,
  resetUserSettingsSyncState,
  syncUserSettingsWithServer,
} from "./user-settings";

vi.mock("../api/settings", () => ({
  getUserSettings: vi.fn(),
}));

describe("user-settings state", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    languageStore.reset({ language: "RU" });
    themeStore.reset({ theme: "light" });
    resetUserSettingsSyncState();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    languageStore.reset({ language: "RU" });
    themeStore.reset({ theme: "light" });
    resetUserSettingsSyncState();
  });

  it("применяет валидные серверные настройки к теме и языку", () => {
    applyUserSettings({ language: "EN", theme: "dark" });

    expect(getCurrentUserSettings()).toEqual({ language: "EN", theme: "dark" });
  });

  it("оставляет текущие значения при неполном ответе", () => {
    applyUserSettings({ language: "EN", theme: "dark" });
    applyUserSettings({});

    expect(getLanguageMode()).toBe("EN");
    expect(getThemeMode()).toBe("dark");
  });

  it("кэширует серверную синхронизацию до force-вызова", async () => {
    vi.mocked(getUserSettings)
      .mockResolvedValueOnce({ language: "EN", theme: "dark" })
      .mockResolvedValueOnce({ language: "RU", theme: "light" });

    await expect(syncUserSettingsWithServer()).resolves.toEqual({ language: "EN", theme: "dark" });
    await expect(syncUserSettingsWithServer()).resolves.toEqual({ language: "EN", theme: "dark" });
    await expect(syncUserSettingsWithServer(undefined, { force: true })).resolves.toEqual({
      language: "RU",
      theme: "light",
    });

    expect(getUserSettings).toHaveBeenCalledTimes(2);
    expect(getCurrentUserSettings()).toEqual({ language: "RU", theme: "light" });
  });
});
