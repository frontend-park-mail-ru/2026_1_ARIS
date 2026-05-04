/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserSettings, updateUserSettings } from "../api/settings";
import { createMemoryStorage } from "../test-utils/storage";
import {
  applyTheme,
  getThemeMode,
  initThemeFromStorage,
  normaliseThemeFromSettings,
  saveThemeToServer,
  syncThemeWithServer,
  themeStore,
} from "./theme";

vi.mock("../api/settings", () => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

describe("theme state", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    themeStore.reset({ theme: "light" });
    document.head.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    themeStore.reset({ theme: "light" });
  });

  it("нормализует тему из серверных настроек", () => {
    expect(normaliseThemeFromSettings({ theme: "dark" })).toBe("dark");
    expect(normaliseThemeFromSettings({ theme: "light" })).toBe("light");
    expect(normaliseThemeFromSettings({ theme: "blue" as "dark" })).toBeNull();
  });

  it("применяет тему к store, DOM, meta theme-color и localStorage", () => {
    const listener = vi.fn();
    window.addEventListener("themechange", listener);

    applyTheme("dark");

    expect(getThemeMode()).toBe("dark");
    expect(localStorage.getItem("arisfront:theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#10182f",
    );
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("themechange", listener);
  });

  it("читает сохранённую тему и игнорирует невалидные значения", () => {
    localStorage.setItem("arisfront:theme", "dark");
    initThemeFromStorage();

    expect(getThemeMode()).toBe("dark");

    localStorage.setItem("arisfront:theme", "contrast");
    initThemeFromStorage();

    expect(getThemeMode()).toBe("light");
  });

  it("синхронизирует тему с сервером и использует текущую при пустом ответе", async () => {
    vi.mocked(getUserSettings).mockResolvedValueOnce({ theme: "dark" }).mockResolvedValueOnce({});

    await expect(syncThemeWithServer()).resolves.toBe("dark");
    expect(getThemeMode()).toBe("dark");

    await expect(syncThemeWithServer()).resolves.toBe("dark");
  });

  it("сохраняет тему на сервере и применяет fallback, если ответ без theme", async () => {
    vi.mocked(updateUserSettings).mockResolvedValue({});

    await saveThemeToServer("dark");

    expect(updateUserSettings).toHaveBeenCalledWith({ theme: "dark" }, undefined);
    expect(getThemeMode()).toBe("dark");
  });
});
