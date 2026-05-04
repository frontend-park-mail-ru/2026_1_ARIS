/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  createPost,
  deletePost,
  getMyPosts,
  getPostById,
  likePost,
  unlikePost,
  updatePost,
  uploadPostImages,
} from "./posts";
import { clearFeedCache } from "../pages/feed/cache";
import { isNetworkUnavailableError } from "../state/network-status";
import { createMemoryStorage } from "../test-utils/storage";
import { enqueueRequest, registerOutboxSync, OutboxQueuedError } from "../utils/outbox-idb";

vi.mock("./core/client", () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
}));

vi.mock("../pages/feed/cache", () => ({
  clearFeedCache: vi.fn(),
}));

vi.mock("../state/network-status", () => ({
  isNetworkUnavailableError: vi.fn(() => false),
}));

vi.mock("../utils/outbox-idb", () => {
  class MockOutboxQueuedError extends Error {
    constructor() {
      super("Запрос поставлен в очередь.");
      this.name = "OutboxQueuedError";
    }
  }

  return {
    enqueueRequest: vi.fn(),
    registerOutboxSync: vi.fn(() => Promise.resolve()),
    OutboxQueuedError: MockOutboxQueuedError,
  };
});

describe("posts api", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("нормализует список публикаций и фильтрует записи без id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      posts: [
        {
          ID: "15",
          profileId: "7",
          author: {
            profileId: "7",
            firstName: "Софья",
            lastName: "Ситниченко",
            username: "sofia",
            userAccountId: "3",
            avatarUrl: "/media/avatar.png",
          },
          media: [
            { media_id: "21", url: "/media/post.png" },
            { mediaID: 0, mediaURL: "" },
          ],
          mediaUrl: ["/legacy.png", ""],
          text: "Пост",
          likes: "6",
          is_liked: "1",
          createdAt: "2026-05-04T10:00:00.000Z",
        },
        { id: 0 },
      ],
    });

    await expect(getMyPosts()).resolves.toEqual([
      {
        id: 15,
        profileID: 7,
        media: [{ mediaID: 21, mediaURL: "/media/post.png" }],
        mediaURL: ["/legacy.png"],
        text: "Пост",
        firstName: "Софья",
        lastName: "Ситниченко",
        userAccountID: 3,
        avatarURL: "/media/avatar.png",
        author: {
          profileID: 7,
          firstName: "Софья",
          lastName: "Ситниченко",
          username: "sofia",
          userAccountID: 3,
          avatarURL: "/media/avatar.png",
        },
        createdAt: "2026-05-04T10:00:00.000Z",
        likes: 6,
        isLiked: true,
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/api/post/me?ts=1777896000000", {}, {});
  });

  it("создаёт, обновляет и удаляет публикации с очисткой кэша ленты", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ id: 1, profileID: 7, text: "new" })
      .mockResolvedValueOnce({ id: 1, profileID: 7, text: "updated" })
      .mockResolvedValueOnce(null);

    await expect(createPost({ text: "new" })).resolves.toMatchObject({ id: 1, text: "new" });
    await expect(updatePost("post id", { text: "updated" })).resolves.toMatchObject({
      id: 1,
      text: "updated",
    });
    await deletePost("post id");

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/post/upload",
      { method: "POST", body: { text: "new" } },
      null,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/post/post%20id",
      { method: "PATCH", body: { text: "updated" } },
      null,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/post/post%20id",
      { method: "DELETE" },
      null,
    );
    expect(clearFeedCache).toHaveBeenCalledTimes(3);
  });

  it("ставит и убирает лайк, сохраняя resolved состояние", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ id: 2, profileID: 7, isLiked: true })
      .mockResolvedValueOnce({ id: 2, profileID: 7, isLiked: false });

    await expect(likePost(2)).resolves.toMatchObject({ id: 2, isLiked: true });
    await expect(unlikePost(2)).resolves.toMatchObject({ id: 2, isLiked: false });

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/post/2/likes", { method: "POST" }, null);
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/post/2/likes", { method: "DELETE" }, null);
    expect(localStorage.getItem("arisfront:post-like-state")).toContain('"2":false');
  });

  it("загружает изображения поста и фильтрует невалидные media", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      media: [
        { mediaId: "8", mediaUrl: "/media/8.png" },
        { mediaID: -1, mediaURL: "" },
      ],
    });

    await expect(uploadPostImages([new File(["img"], "img.png")])).resolves.toEqual([
      { mediaID: 8, mediaURL: "/media/8.png" },
    ]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/media/upload?for=post",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      {},
    );
  });

  it("ставит мутацию в outbox при сетевой ошибке", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new TypeError("failed to fetch"));
    vi.mocked(isNetworkUnavailableError).mockReturnValue(true);

    await expect(createPost({ text: "offline" })).rejects.toBeInstanceOf(OutboxQueuedError);

    expect(enqueueRequest).toHaveBeenCalledWith({
      url: "/api/post/upload",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "offline" }),
    });
    expect(registerOutboxSync).toHaveBeenCalledTimes(1);
    expect(clearFeedCache).toHaveBeenCalledTimes(1);
  });

  it("getPostById бросает понятную ошибку для пустого ответа", async () => {
    vi.mocked(apiRequest).mockResolvedValue(null);

    await expect(getPostById("missing")).rejects.toThrow("Не удалось загрузить публикацию.");
  });
});
