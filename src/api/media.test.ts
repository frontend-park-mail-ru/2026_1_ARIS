/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import { getMediaUrlById } from "./media";

vi.mock("./core/client", () => ({
  apiRequest: vi.fn(),
}));

describe("media api", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("загружает публичную ссылку на медиа по ID", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ mediaURL: "/media/avatar.png" });
    const signal = new AbortController().signal;

    await expect(getMediaUrlById(" 12 ", signal)).resolves.toBe("/media/avatar.png");

    expect(apiRequest).toHaveBeenCalledWith("/api/media/12/url", { signal }, {});
  });

  it("не делает запрос для пустого или невалидного ID", async () => {
    await expect(getMediaUrlById("")).resolves.toBe("");
    await expect(getMediaUrlById("abc")).resolves.toBe("");

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
