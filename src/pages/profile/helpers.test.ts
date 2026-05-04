/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  getAvatarEditorSrc,
  getAvatarImageSrc,
  getInitials,
  hasVisibleValue,
} from "./helpers";

describe("profile helpers", () => {
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
});
