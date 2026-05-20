/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  addStickerToPack,
  createStickerPack,
  createOrResolvePrivateChatId,
  createPrivateChat,
  deleteMessageReaction,
  getChatMessages,
  getChats,
  getStickerPacks,
  getStickersByPack,
  sendChatMessage,
  setMessageReaction,
  subscribeToChatMessages,
  updateChatMessageText,
  uploadStickerImage,
} from "./chat";
import { getSessionUser } from "../state/session";

vi.mock("./core/client", () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
}));

vi.mock("../state/session", () => ({
  getSessionUser: vi.fn(() => null),
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.OPEN;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });
  private listeners = new Map<string, Array<(event: Event | MessageEvent<string>) => void>>();

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event | MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string, event: Event | MessageEvent<string> = new Event(type)): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe("chat api", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    MockWebSocket.instances = [];
  });

  it("нормализует список чатов и фильтрует пустые id", async () => {
    vi.mocked(apiRequest).mockResolvedValue([
      { ID: 7, Title: "Софья", avatarLink: "/media/a.png", UpdatedAt: "2026-05-04" },
      { title: "empty id" },
    ]);

    await expect(getChats()).resolves.toEqual([
      {
        id: "7",
        title: "Софья",
        avatarLink: "/media/a.png",
        updatedAt: "2026-05-04",
        createdAt: undefined,
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/api/chats", {}, []);
  });

  it("создаёт приватный чат и возвращает id, если title совпал", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: "chat-1", title: "Софья Ситниченко" });

    await expect(createPrivateChat("user id")).resolves.toMatchObject({
      id: "chat-1",
      title: "Софья Ситниченко",
    });
    await expect(
      createOrResolvePrivateChatId("user id", { expectedTitle: "  Софья   Ситниченко " }),
    ).resolves.toBe("chat-1");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/chats?otherUserId=user%20id",
      { method: "POST" },
      {},
    );
  });

  it("нормализует сообщения и отправляет новое сообщение", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce([
        {
          ID: 1,
          uid: "msg-uid",
          Text: "Привет",
          AuthorName: "Софья",
          AuthorID: 7,
          CreatedAt: "2026-05-04",
          media: [{ id: "9", uid: "media-uid", mimeType: "image/png", url: "/media/9" }],
          files: [{ id: "10", uid: "file-uid", mimeType: "application/pdf", url: "/media/10" }],
          reactions: [{ type: "👍", count: "2" }],
          myReaction: "👍",
        },
        { text: "empty id" },
      ])
      .mockResolvedValueOnce({ id: 2, text: "Ответ", authorId: 8 });

    await expect(getChatMessages("chat id")).resolves.toEqual([
      {
        id: "1",
        text: "Привет",
        authorName: "Софья",
        authorId: "7",
        uid: "msg-uid",
        media: [{ id: "9", uid: "media-uid", mimeType: "image/png", url: "/media/9" }],
        files: [{ id: "10", uid: "file-uid", mimeType: "application/pdf", url: "/media/10" }],
        reactions: [{ type: "👍", count: 2 }],
        myReaction: "👍",
        isActive: true,
        createdAt: "2026-05-04",
        updatedAt: undefined,
      },
    ]);
    await expect(sendChatMessage("chat id", { text: "Ответ" })).resolves.toMatchObject({
      id: "2",
      text: "Ответ",
      authorId: "8",
      media: [],
      files: [],
      reactions: [],
      isActive: true,
    });

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/chats/chat%20id/messages", {}, []);
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/chats/chat%20id/messages",
      { method: "POST", body: { text: "Ответ" } },
      {},
    );
  });

  it("возвращает inert subscription для гостя", () => {
    vi.mocked(getSessionUser).mockReturnValue(null);

    const subscription = subscribeToChatMessages("1", { onMessage: vi.fn() });

    expect(subscription.isOpen()).toBe(false);
    expect(subscription.send({ text: "ping" })).toBe(false);
    expect(() => subscription.close()).not.toThrow();
  });

  it("подписывается на WebSocket, парсит сообщения и отправляет payload", () => {
    vi.mocked(getSessionUser).mockReturnValue({
      id: "7",
      firstName: "Софья",
      lastName: "Ситниченко",
    });
    vi.stubGlobal("WebSocket", MockWebSocket);
    window.history.replaceState({}, "", "/chats");
    const onMessage = vi.fn();
    const onOpen = vi.fn();

    const subscription = subscribeToChatMessages("chat id", { onMessage, onOpen });
    const socket = MockWebSocket.instances[0];

    socket?.emit("open");
    socket?.emit(
      "message",
      new MessageEvent("message", {
        data: JSON.stringify({ ID: 3, Text: "Новое", AuthorID: 7 }),
      }),
    );

    expect(socket?.url).toBe(`ws://${window.location.host}/ws/chat%20id`);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      id: "3",
      text: "Новое",
      authorName: undefined,
      authorId: "7",
      media: [],
      files: [],
      reactions: [],
      isActive: true,
      createdAt: undefined,
      updatedAt: undefined,
    });
    expect(subscription.isOpen()).toBe(true);
    expect(subscription.send({ text: "ok" })).toBe(true);
    expect(socket?.send).toHaveBeenCalledWith(JSON.stringify({ text: "ok" }));

    subscription.close();
    expect(socket?.close).toHaveBeenCalledTimes(1);
  });

  it("поддерживает новый контракт сообщений, стикеров и реакций", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ id: 3, text: "edited", authorId: 7 })
      .mockResolvedValueOnce([
        { id: "1", uid: "pack-uid", title: "ARIS demo stickers", authorId: null },
      ])
      .mockResolvedValueOnce([
        {
          id: "5",
          uid: "sticker-uid",
          packId: "1",
          mediaId: "99",
          mimeType: "image/svg+xml",
          url: "/media/99",
        },
      ])
      .mockResolvedValueOnce({ id: "2", uid: "new-pack-uid", title: "Mine", authorId: "7" })
      .mockResolvedValueOnce({
        id: "6",
        uid: "created-sticker-uid",
        packId: "2",
        mediaId: "100",
        mimeType: "image/png",
        url: "/media/100",
      })
      .mockResolvedValueOnce({ media: [{ mediaID: 100, mediaURL: "/media/100" }] })
      .mockResolvedValueOnce({ id: 3, text: "reacted", authorId: 7, myReaction: "❤️" })
      .mockResolvedValueOnce({ id: 3, text: "reacted", authorId: 7 });

    await updateChatMessageText("7", 3, "edited");
    await expect(getStickerPacks({ search: "demo", limit: 10, offset: 5 })).resolves.toEqual([
      {
        id: "1",
        uid: "pack-uid",
        title: "ARIS demo stickers",
        authorId: null,
      },
    ]);
    await expect(getStickersByPack(1)).resolves.toEqual([
      {
        id: "5",
        uid: "sticker-uid",
        packId: "1",
        mediaId: "99",
        mimeType: "image/svg+xml",
        url: "/media/99",
      },
    ]);
    await expect(createStickerPack({ title: " Mine " })).resolves.toMatchObject({
      id: "2",
      title: "Mine",
    });
    await expect(addStickerToPack(2, { mediaID: 100, sortOrder: 0 })).resolves.toMatchObject({
      id: "6",
      mediaId: "100",
    });
    await expect(
      uploadStickerImage(new File(["png"], "s.png", { type: "image/png" })),
    ).resolves.toEqual({
      mediaID: 100,
      mediaURL: "/media/100",
    });
    await expect(setMessageReaction("7", 3, "❤️")).resolves.toMatchObject({
      myReaction: "❤️",
    });
    await expect(deleteMessageReaction("7", 3)).resolves.toMatchObject({ id: "3" });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/chats/7/messages/3",
      { method: "PUT", body: { text: "edited" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/sticker-packs?search=demo&limit=10&offset=5",
      {},
      [],
    );
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/sticker-packs/1/stickers", {}, []);
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/sticker-packs",
      { method: "POST", body: { title: "Mine" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      "/api/sticker-packs/2/stickers",
      { method: "POST", body: { mediaID: 100, sortOrder: 0 } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      6,
      "/api/media/upload?for=sticker",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      7,
      "/api/chats/7/messages/3/reaction",
      { method: "PUT", body: { type: "❤️" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      8,
      "/api/chats/7/messages/3/reaction",
      { method: "DELETE" },
      {},
    );
  });
});
