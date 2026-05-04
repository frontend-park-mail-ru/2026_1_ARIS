/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  escapeHtml,
  getAvatarInitials,
  markAvatarSrcBroken,
  prepareAvatarLinks,
  renderAvatarMarkup,
  resolveAvatarSrc,
} from "./avatar";

describe("avatar helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("экранирует HTML и строит инициалы", () => {
    expect(escapeHtml(`<b title="x&y">'`)).toBe("&lt;b title=&quot;x&amp;y&quot;&gt;&#39;");
    expect(getAvatarInitials("Сергей Шульгиненко")).toBe("СШ");
    expect(getAvatarInitials("@username")).toBe("US");
    expect(getAvatarInitials("")).toBe("AR");
  });

  it("нормализует avatar src и учитывает список битых ссылок", () => {
    const src = "/media/avatar-broken.png";

    expect(resolveAvatarSrc(src)).toBe("http://localhost:8080/media/avatar-broken.png");

    markAvatarSrcBroken(src);

    expect(resolveAvatarSrc(src)).toBe("");
  });

  it("рендерит fallback, если аватара нет или это default-avatar", () => {
    expect(renderAvatarMarkup("user-avatar", "Иван Иванов")).toBe(
      '<span class="user-avatar avatar-fallback" role="img" aria-label="Иван Иванов">ИИ</span>',
    );
    expect(renderAvatarMarkup("user-avatar", "<Admin>", "/assets/img/default-avatar.png")).toBe(
      '<span class="user-avatar avatar-fallback" role="img" aria-label="&lt;Admin&gt;">&lt;A</span>',
    );
  });

  it("рендерит img с безопасными атрибутами", () => {
    const html = renderAvatarMarkup("user-avatar", `"Admin"`, "/media/avatar-ok.png", {
      width: 48,
      height: 40,
      loading: "eager",
      fetchPriority: "high",
    });

    expect(html).toContain('class="user-avatar"');
    expect(html).toContain('width="48"');
    expect(html).toContain('height="40"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('src="http://localhost:8080/media/avatar-ok.png"');
    expect(html).toContain('alt="&quot;Admin&quot;"');
  });

  it("предзагружает уникальные ссылки и помечает ошибочные изображения", async () => {
    const createdImages: Array<{ onload: (() => void) | null; onerror: (() => void) | null }> = [];

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = "";
      complete = false;
      naturalWidth = 0;
      set src(_value: string) {
        createdImages.push(this);
      }
    }

    vi.stubGlobal("Image", MockImage);

    const promise = prepareAvatarLinks(["/media/preload.png", "/media/preload.png"], 1000);
    expect(createdImages).toHaveLength(1);

    createdImages[0]?.onerror?.();
    await promise;

    expect(resolveAvatarSrc("/media/preload.png")).toBe("");
  });
});
