import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserSettings } from "../api/settings";
import {
  getLanguageMode,
  initLanguageFromStorage,
  languageStore,
  saveLanguageToServer,
} from "./language";

vi.mock("../api/settings", () => ({
  updateUserSettings: vi.fn(),
}));

function createMemoryStorage(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear: vi.fn(() => storage.clear()),
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, String(value));
    }),
  };
}

describe("language state", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    languageStore.reset({ language: "RU" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    languageStore.reset({ language: "RU" });
  });

  it("использует русский язык по умолчанию", () => {
    expect(getLanguageMode()).toBe("RU");
  });

  it("читает язык из localStorage", () => {
    localStorage.setItem("arisfront:language", "EN");

    initLanguageFromStorage();

    expect(getLanguageMode()).toBe("EN");
  });

  it("игнорирует невалидный язык из localStorage", () => {
    localStorage.setItem("arisfront:language", "FR");

    initLanguageFromStorage();

    expect(getLanguageMode()).toBe("RU");
  });

  it("сохраняет язык через API и применяет ответ сервера", async () => {
    vi.mocked(updateUserSettings).mockResolvedValue({ language: "EN" });

    await saveLanguageToServer("EN");

    expect(updateUserSettings).toHaveBeenCalledWith({ language: "EN" }, undefined);
    expect(getLanguageMode()).toBe("EN");
    expect(localStorage.getItem("arisfront:language")).toBe("EN");
  });

  it("оставляет отправленный язык, если сервер не вернул language", async () => {
    vi.mocked(updateUserSettings).mockResolvedValue({});

    await saveLanguageToServer("EN");

    expect(getLanguageMode()).toBe("EN");
  });
});
