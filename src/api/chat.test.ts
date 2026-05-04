/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  createOrResolvePrivateChatId,
  createPrivateChat,
  getChatMessages,
  getChats,
  sendChatMessage,
  subscribeToChatMessages,
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
        { ID: 1, Text: "Привет", AuthorName: "Софья", AuthorID: 7, CreatedAt: "2026-05-04" },
        { text: "empty id" },
      ])
      .mockResolvedValueOnce({ id: 2, text: "Ответ", authorId: 8 });

    await expect(getChatMessages("chat id")).resolves.toEqual([
      {
        id: "1",
        text: "Привет",
        authorName: "Софья",
        authorId: "7",
        createdAt: "2026-05-04",
      },
    ]);
    await expect(sendChatMessage("chat id", { text: "Ответ" })).resolves.toMatchObject({
      id: "2",
      text: "Ответ",
      authorId: "8",
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
      createdAt: undefined,
    });
    expect(subscription.isOpen()).toBe(true);
    expect(subscription.send({ text: "ok" })).toBe(true);
    expect(socket?.send).toHaveBeenCalledWith(JSON.stringify({ text: "ok" }));

    subscription.close();
    expect(socket?.close).toHaveBeenCalledTimes(1);
  });
});
