/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  ApiError,
  getMyProfile,
  getProfileById,
  updateMyProfile,
  uploadProfileAvatar,
} from "./profile";

vi.mock("./core/client", () => {
  class MockApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  return {
    ApiError: MockApiError,
    apiRequest: vi.fn(),
  };
});

describe("profile api", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("добавляет cache-busting ts к запросам профиля", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ firstName: "A", lastName: "B" });
    const signal = new AbortController().signal;

    await getMyProfile(signal);
    await getProfileById("profile id", signal);

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/profile/me?ts=1777896000000",
      { signal },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/profile/profile%20id?ts=1777896000000",
      { signal },
      {},
    );
  });

  it("отправляет PATCH при обновлении профиля", async () => {
    vi.mocked(apiRequest).mockResolvedValue(null);

    await updateMyProfile({ firstName: "Иван", removeAvatar: true });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/profile/me/edit",
      { method: "PATCH", body: { firstName: "Иван", removeAvatar: true } },
      null,
    );
  });

  it("загружает avatar file и нормализует варианты media payload", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ media: [{ media_id: "11", url: "/media/a.png" }] });
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    await expect(uploadProfileAvatar(file)).resolves.toEqual({
      mediaID: 11,
      mediaURL: "/media/a.png",
    });

    const [, options] = vi.mocked(apiRequest).mock.calls[0] ?? [];
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/media/upload?for=avatar",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      {},
    );
    expect(options?.body).toBeInstanceOf(FormData);
  });

  it("бросает ApiError, если upload не вернул валидный файл", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ media: [{ mediaID: 0, mediaURL: "" }] });

    await expect(uploadProfileAvatar(new File(["x"], "bad.png"))).rejects.toBeInstanceOf(ApiError);
  });
});
