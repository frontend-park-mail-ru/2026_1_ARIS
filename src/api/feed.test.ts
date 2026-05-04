import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  getFeed,
  getPopularPosts,
  getPublicFeed,
  getPublicPopularPosts,
  mapFeedItemToPostcard,
  mapFeedResponse,
} from "./feed";
import { createMemoryStorage } from "../test-utils/storage";

vi.mock("./core/client", () => ({
  apiRequest: vi.fn(),
}));

describe("feed api", () => {
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

  it("маппит пост ленты в карточку и запоминает server like state", () => {
    const card = mapFeedItemToPostcard({
      id: 42,
      author: {
        id: "7",
        username: "sofia",
        firstName: "Софья",
        lastName: "Ситниченко",
        avatarLink: "/media/a.png",
      },
      text: "Привет",
      createdAt: "2026-05-04T10:30:00.000Z",
      likes: "12",
      liked: "yes",
      comments: 3,
      reposts: 1,
      medias: [{ mediaLink: "/media/post.png" }, {}],
    });

    expect(card).toEqual({
      id: "42",
      authorId: "7",
      author: "sofia",
      firstName: "Софья",
      lastName: "Ситниченко",
      avatar: "/media/a.png",
      time: "1 ч назад",
      timeRaw: "2026-05-04T10:30:00.000Z",
      text: "Привет",
      likes: 12,
      isLiked: true,
      comments: 3,
      reposts: 1,
      images: ["/media/post.png"],
    });
    expect(localStorage.getItem("arisfront:post-like-state")).toContain('"42":true');
  });

  it("mapFeedResponse возвращает безопасные defaults", () => {
    expect(mapFeedResponse()).toEqual({ items: [], nextCursor: "", hasMore: false });
    expect(mapFeedResponse({ posts: [], nextCursor: "abc", hasMore: true })).toEqual({
      items: [],
      nextCursor: "abc",
      hasMore: true,
    });
  });

  it("строит URL авторизованной и публичной ленты", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ posts: [] });
    const signal = new AbortController().signal;

    await getFeed({ cursor: "next", limit: 5, signal });
    await getPublicFeed({ limit: 10 });

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/feed?cursor=next&limit=5", { signal }, {});
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/public/feed?limit=10", {}, {});
  });

  it("запрашивает популярные посты для пользователя и гостя", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] });

    await getPopularPosts();
    await getPublicPopularPosts();

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/posts/popular", {}, {});
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/public/popular-posts", {}, {});
  });
});
