/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../../test-utils/storage";
import { applyLanguage, languageStore } from "../../state/language";
import { sessionStore, setSessionUser } from "../../state/session";
import type { ChatViewMessage } from "./types";
import {
  escapeHtml,
  formatChatDayLabel,
  formatChatExactTime,
  formatChatTime,
  formatMessageTime,
  getChatDateKey,
  getCurrentUserFullName,
  getNormalisedPersonName,
  isChatDateToday,
  isOfflineNetworkError,
  isOwnMessage,
  looksLikeDirectPersonName,
  resolvePersonPath,
  sortMessagesByCreatedAt,
  splitFullName,
  stripChatIdFromNonChatsUrl,
  syncSelectedChatToUrl,
} from "./helpers";

describe("chats helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
    vi.stubGlobal("localStorage", createMemoryStorage());
    languageStore.reset({ language: "RU" });
    sessionStore.reset({ user: null, feedMode: "by-time" });
    window.history.replaceState({}, "", "/chats");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    languageStore.reset({ language: "RU" });
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  it("сортирует сообщения и экранирует HTML", () => {
    const messages: ChatViewMessage[] = [
      {
        id: "2",
        text: "second",
        authorName: "B",
        createdAt: "2026-05-04T11:00:00.000Z",
        isOwn: false,
      },
      {
        id: "1",
        text: "first",
        authorName: "A",
        createdAt: "2026-05-04T10:00:00.000Z",
        isOwn: false,
      },
    ];

    expect(sortMessagesByCreatedAt(messages).map((message) => message.id)).toEqual(["1", "2"]);
    expect(escapeHtml(`<b title="x&y">'`)).toBe("&lt;b title=&quot;x&amp;y&quot;&gt;&#39;");
  });

  it("работает с именами и путями профиля", () => {
    expect(splitFullName("  Софья   Ситниченко  ")).toEqual({
      firstName: "Софья",
      lastName: "Ситниченко",
    });
    expect(resolvePersonPath("Unknown Person", "42")).toBe("/id42");
    expect(resolvePersonPath("Софья Ситниченко")).toBe("/id1");
    expect(getNormalisedPersonName("  Софья Ситниченко  ")).toBe("софья ситниченко");
  });

  it("форматирует даты чата", () => {
    const today = "2026-05-04T10:05:00.000Z";
    const old = "2025-12-31T20:30:00.000Z";

    expect(getChatDateKey(today)).toBe("2026-05-04");
    expect(isChatDateToday(today)).toBe(true);
    expect(formatMessageTime(today)).not.toBe("");
    expect(formatChatTime(today)).toBe(formatMessageTime(today));
    expect(formatChatTime(old)).toContain("2025");
    expect(formatChatDayLabel(today)).toBe("Сегодня");
    expect(formatChatExactTime(old)).toContain("\n");

    applyLanguage("EN", { persist: false, emit: false });
    expect(formatChatDayLabel(today)).toBe("Today");
  });

  it("распознаёт direct person names и текущего пользователя", () => {
    setSessionUser({ id: "7", firstName: "Софья", lastName: "Ситниченко" });

    expect(getCurrentUserFullName()).toBe("Софья Ситниченко");
    expect(looksLikeDirectPersonName("Софья Ситниченко")).toBe(true);
    expect(looksLikeDirectPersonName("ARIS support chat")).toBe(false);
    expect(isOwnMessage("7")).toBe(true);
    expect(isOwnMessage(undefined, "Софья Ситниченко")).toBe(true);
  });

  it("синхронизирует chatId только на /chats", () => {
    syncSelectedChatToUrl("42");
    expect(window.location.pathname + window.location.search).toBe("/chats?chatId=42");

    syncSelectedChatToUrl("", { replace: true });
    expect(window.location.pathname + window.location.search).toBe("/chats");

    window.history.replaceState({}, "", "/feed?chatId=42&x=1");
    stripChatIdFromNonChatsUrl();
    expect(window.location.pathname + window.location.search).toBe("/feed?x=1");
  });

  it("распознаёт offline-сетевые ошибки", () => {
    expect(isOfflineNetworkError(new TypeError("failed"))).toBe(true);
    expect(isOfflineNetworkError(new Error("other"))).toBe(false);
  });
});
