/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, type User } from "../api/auth";
import { getMyProfile } from "../api/profile";
import { createMemoryStorage } from "../test-utils/storage";
import { isNetworkUnavailableError } from "./network-status";
import {
  clearSessionUser,
  getFeedMode,
  getSessionUser,
  initSession,
  sessionStore,
  setFeedMode,
  setSessionUser,
  setSessionUserSilently,
} from "./session";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("../api/profile", () => ({
  getMyProfile: vi.fn(),
}));

vi.mock("./network-status", () => ({
  isNetworkUnavailableError: vi.fn(() => false),
}));

const user: User = {
  id: "7",
  firstName: "Софья",
  lastName: "Ситниченко",
  login: "sofia",
  role: "user",
};

describe("session state", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    sessionStore.reset({ user: null, feedMode: "by-time" });
    window.history.replaceState({}, "", "/feed");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  it("сохраняет и очищает пользователя с событием sessionchange", () => {
    const listener = vi.fn();
    window.addEventListener("sessionchange", listener);

    setSessionUser(user);

    expect(getSessionUser()).toEqual(user);
    expect(localStorage.getItem("arisfront:session-user")).toContain('"id":"7"');
    expect(listener).toHaveBeenCalledTimes(1);

    clearSessionUser();

    expect(getSessionUser()).toBeNull();
    expect(localStorage.getItem("arisfront:session-user")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener("sessionchange", listener);
  });

  it("умеет менять пользователя без события", () => {
    const listener = vi.fn();
    window.addEventListener("sessionchange", listener);

    setSessionUserSilently(user);

    expect(getSessionUser()).toEqual(user);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("sessionchange", listener);
  });

  it("сохраняет режим ленты", () => {
    const listener = vi.fn();
    window.addEventListener("sessionchange", listener);

    setFeedMode("for-you");

    expect(getFeedMode()).toBe("for-you");
    expect(localStorage.getItem("feedMode")).toBe("for-you");
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("sessionchange", listener);
  });

  it("не делает auth-probe на публичной гостевой странице", async () => {
    const listener = vi.fn();
    window.addEventListener("sessionchange", listener);

    await initSession();

    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: { key: "init", state: { user: null, feedMode: "by-time" } },
    });

    window.removeEventListener("sessionchange", listener);
  });

  it("восстанавливает сессию и дополняет аватар из профиля", async () => {
    localStorage.setItem("feedMode", "for-you");
    localStorage.setItem("arisfront:session-user", JSON.stringify({ ...user, role: "admin" }));
    vi.mocked(getCurrentUser).mockResolvedValue({ ...user, avatarLink: "" });
    vi.mocked(getMyProfile).mockResolvedValue({
      firstName: "Софья",
      lastName: "Ситниченко",
      imageLink: "/media/avatar.png",
    });

    await initSession();

    expect(getFeedMode()).toBe("for-you");
    expect(getSessionUser()).toMatchObject({ id: "7", avatarLink: "/media/avatar.png" });
    expect(localStorage.getItem("arisfront:session-user")).toContain("/media/avatar.png");
  });

  it("очищает пользователя при не сетевой ошибке auth-probe", async () => {
    window.history.replaceState({}, "", "/settings");
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("401"));
    vi.mocked(isNetworkUnavailableError).mockReturnValue(false);

    await initSession();

    expect(getSessionUser()).toBeNull();
  });

  it("оставляет сохранённого пользователя при сетевой ошибке auth-probe", async () => {
    window.history.replaceState({}, "", "/settings");
    localStorage.setItem("arisfront:session-user", JSON.stringify(user));
    vi.mocked(getCurrentUser).mockRejectedValue(new TypeError("failed to fetch"));
    vi.mocked(isNetworkUnavailableError).mockReturnValue(true);

    await initSession();

    expect(getSessionUser()).toEqual(user);
  });
});
