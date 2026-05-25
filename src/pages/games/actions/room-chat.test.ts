/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { sendGameRoomMessage } from "../../../api/games";
import {
  submitRoomChatForm,
  submitRoomChatMessage,
  type SubmitRoomChatMessageOptions,
} from "./room-chat";

vi.mock("../../../api/games", () => ({
  sendGameRoomMessage: vi.fn(),
}));

const room = {
  id: "room-1",
} as GameRoom;

const apiMessage = {
  id: "message-1",
  roomId: "room-1",
  text: "Hello",
} as GameRoomMessage;

/** Создаёт options для тестов отправки сообщения чата. */
function createOptions(overrides: Partial<SubmitRoomChatMessageOptions> = {}) {
  const options: SubmitRoomChatMessageOptions = {
    room,
    sending: false,
    text: "Hello",
    currentMessages: [],
    getCurrentRoom: () => room,
    enrichOwnMessage: (_room, message) => ({ ...message, authorName: "Me" }),
    getAuthorAvatar: () => "/avatar.jpg",
    hydrateAuthorAvatars: vi.fn().mockResolvedValue([]),
    prepareAvatarLinks: vi.fn(),
    mergeMessages: vi.fn((existing, incoming) => [...existing, ...incoming]),
    refreshChat: vi.fn(),
    setChatState: vi.fn(),
    ...overrides,
  };
  return options;
}

describe("submitRoomChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("отправляет сообщение и добавляет его в локальный чат", async () => {
    vi.mocked(sendGameRoomMessage).mockResolvedValue(apiMessage);
    const options = createOptions();

    await submitRoomChatMessage(options);

    expect(sendGameRoomMessage).toHaveBeenCalledWith("room-1", "Hello");
    expect(options.setChatState).toHaveBeenLastCalledWith(
      {
        roomChatMessages: [{ ...apiMessage, authorName: "Me" }],
        roomChatDraft: "",
        roomChatSending: false,
        roomChatError: "",
      },
      { scrollToBottom: true, forceScrollToBottom: true },
    );
  });

  it("не отправляет пустое сообщение", async () => {
    const options = createOptions({ text: "   " });

    await submitRoomChatMessage(options);

    expect(sendGameRoomMessage).not.toHaveBeenCalled();
    expect(options.setChatState).not.toHaveBeenCalled();
  });

  it("снимает sending, если пользователь перешел в другую комнату", async () => {
    vi.mocked(sendGameRoomMessage).mockResolvedValue(apiMessage);
    const options = createOptions({
      getCurrentRoom: () => ({ id: "room-2" }) as GameRoom,
    });

    await submitRoomChatMessage(options);

    expect(options.setChatState).toHaveBeenLastCalledWith(
      { roomChatSending: false },
      { scrollToBottom: false },
    );
  });

  it("читает текст сообщения из формы чата", async () => {
    vi.mocked(sendGameRoomMessage).mockResolvedValue(apiMessage);
    const form = document.createElement("form");
    form.innerHTML = `<textarea name="text">From form</textarea>`;
    const options = createOptions();

    await submitRoomChatForm(form, options);

    expect(sendGameRoomMessage).toHaveBeenCalledWith("room-1", "From form");
  });
});
