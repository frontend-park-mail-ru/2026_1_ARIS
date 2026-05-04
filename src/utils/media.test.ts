/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "./media";

describe("media url helpers", () => {
  it("возвращает пустую строку для отсутствующих и технических значений", () => {
    expect(resolveMediaUrl()).toBe("");
    expect(resolveMediaUrl(" null ")).toBe("");
    expect(resolveMediaUrl("undefined")).toBe("");
    expect(resolveMediaUrl("none")).toBe("");
  });

  it("оставляет абсолютные, data, blob и proxy-ссылки без изменений", () => {
    expect(resolveMediaUrl("https://cdn.example/image.png")).toBe("https://cdn.example/image.png");
    expect(resolveMediaUrl("data:image/png;base64,a")).toBe("data:image/png;base64,a");
    expect(resolveMediaUrl("blob:http://localhost/id")).toBe("blob:http://localhost/id");
    expect(resolveMediaUrl("/image-proxy?url=%2Fmedia%2F1.png")).toBe(
      "/image-proxy?url=%2Fmedia%2F1.png",
    );
  });

  it("добавляет backend origin для относительных ссылок на localhost", () => {
    expect(resolveMediaUrl("/media/avatar.png")).toBe("http://localhost:8080/media/avatar.png");
    expect(resolveMediaUrl("media/avatar.png")).toBe("http://localhost:8080/media/avatar.png");
    expect(resolveMediaUrl("./media/avatar.png")).toBe("http://localhost:8080/media/avatar.png");
  });

  it("подставляет текущий protocol для protocol-relative ссылок", () => {
    expect(resolveMediaUrl("//cdn.example/image.png")).toBe("http://cdn.example/image.png");
  });
});
