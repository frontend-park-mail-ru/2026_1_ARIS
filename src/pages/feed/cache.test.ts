import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../../test-utils/storage";
import { getFeedItemsStorageKey, persistFeedItems, readPersistedFeedItems } from "./cache";
import type { FeedCachedPage } from "./types";

describe("feed cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    vi.stubGlobal("sessionStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("сохраняет метаданные пагинации вместе с постами", () => {
    const page: FeedCachedPage = {
      items: [
        {
          id: "1",
          authorId: "2",
          author: "user",
          firstName: "Иван",
          lastName: "Козлов",
          avatar: "/avatar.png",
          time: "только что",
          timeRaw: "2026-05-29T12:00:00.000Z",
          text: "Пост",
          likes: 0,
          comments: 0,
          reposts: 0,
          images: [],
          media: [],
          files: [],
        },
      ],
      nextCursor: "cursor-2",
      hasMore: true,
    };

    persistFeedItems("authorised", "for-you", page);

    expect(readPersistedFeedItems("authorised", "for-you")).toEqual(page);
  });

  it("игнорирует старый формат без cursor, чтобы не обрывать infinite scroll", () => {
    sessionStorage.setItem(getFeedItemsStorageKey("authorised", "for-you"), JSON.stringify([]));

    expect(readPersistedFeedItems("authorised", "for-you")).toBeNull();
  });
});
