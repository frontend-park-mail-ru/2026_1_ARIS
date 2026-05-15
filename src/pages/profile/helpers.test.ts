/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canEditProfilePost,
  escapeHtml,
  getAvatarEditorSrc,
  getAvatarImageSrc,
  getInitials,
  hasVisibleValue,
} from "./helpers";
import type { ProfilePost } from "./types";

function createProfilePost(overrides: Partial<ProfilePost> = {}): ProfilePost {
  return {
    id: "1",
    authorId: "7",
    authorFirstName: "Сергей",
    authorLastName: "Шульгиненко",
    authorUsername: "sergey",
    isOwnPost: true,
    text: "Пост",
    time: "",
    timeRaw: "",
    likes: 0,
    reposts: 0,
    comments: 0,
    media: [],
    images: [],
    ...overrides,
  };
}

describe("profile helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("экранирует HTML и строит инициалы", () => {
    expect(escapeHtml(`"A&B"`)).toBe("&quot;A&amp;B&quot;");
    expect(getInitials("Софья", "Ситниченко")).toBe("СС");
  });

  it("строит src аватара для разных видов ссылок", () => {
    expect(getAvatarImageSrc()).toBe("/assets/img/default-avatar.png");
    expect(getAvatarImageSrc("data:image/png;base64,a")).toBe("data:image/png;base64,a");
    expect(getAvatarImageSrc("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(getAvatarImageSrc("/media/a.png")).toBe("/image-proxy?url=%2Fmedia%2Fa.png");
  });

  it("оставляет backend media path для редактора и proxy для внешних ссылок", () => {
    expect(getAvatarEditorSrc("http://localhost:8080/media/a.png")).toBe("/media/a.png");
    expect(getAvatarEditorSrc("https://cdn.example/a.png")).toBe(
      "/image-proxy?url=https%3A%2F%2Fcdn.example%2Fa.png",
    );
  });

  it("определяет видимые значения профиля", () => {
    expect(hasVisibleValue("Москва")).toBe(true);
    expect(hasVisibleValue("  ")).toBe(false);
    expect(hasVisibleValue("Не указано")).toBe(false);
    expect(hasVisibleValue()).toBe(false);
  });

  it("разрешает редактировать пост профиля только первые 10 минут", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));

    expect(canEditProfilePost(createProfilePost({ timeRaw: "2026-05-04T11:51:00.000Z" }))).toBe(
      true,
    );
    expect(canEditProfilePost(createProfilePost({ timeRaw: "2026-05-04T11:49:00.000Z" }))).toBe(
      false,
    );
    expect(canEditProfilePost(createProfilePost())).toBe(false);
  });
});
