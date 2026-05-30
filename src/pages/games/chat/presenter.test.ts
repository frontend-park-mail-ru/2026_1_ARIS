/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createRoomSystemMessage } from "./model";
import { getRoomChatRenderMessage, renderRoomChatPresenter } from "./presenter";

/** Создаёт комнату для тестов presenter чата. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    status: "active",
    players: [
      {
        profileId: "profile-1",
        name: "Анна Иванова",
        firstName: "Анна",
        avatarUrl: "/anna.png",
      },
    ],
    ...overrides,
  } as GameRoom;
}

/** Создаёт пользовательское сообщение комнаты. */
function createMessage(overrides: Partial<GameRoomMessage> = {}): GameRoomMessage {
  return {
    id: "message-1",
    roomId: "room-1",
    authorProfileId: "profile-1",
    authorUserAccountId: "user-1",
    authorName: "Анна Иванова",
    authorFirstName: "Анна",
    authorLastName: "Иванова",
    authorUsername: "anna",
    authorAvatarId: "",
    authorAvatarUrl: "/anna.png",
    text: "Привет",
    createdAt: "2026-05-25T10:30:00.000Z",
    ...overrides,
  };
}

/** Создаёт adapter presenter чата. */
function createAdapter() {
  return {
    getRoomChatAuthorName: (_room: GameRoom, message: GameRoomMessage) => message.authorName,
    getRoomChatAuthorFirstName: (_room: GameRoom, message: GameRoomMessage) =>
      message.authorFirstName,
    getRoomChatAuthorAvatar: (_room: GameRoom, message: GameRoomMessage) => message.authorAvatarUrl,
    getRoomChatPlayer: (room: GameRoom, message: GameRoomMessage) =>
      room.players.find((player) => player.profileId === message.authorProfileId),
    renderProfileLink: (options: { content: string }) => `<a>${options.content}</a>`,
  };
}

describe("games room chat presenter", () => {
  it("собирает render-модель пользовательского сообщения", () => {
    const room = createRoom();
    const message = createMessage();

    const item = getRoomChatRenderMessage(message, room, createAdapter());

    expect(item).toMatchObject({
      isSystemMessage: false,
      authorName: "Анна Иванова",
      firstName: "Анна",
      avatarUrl: "/anna.png",
      authorProfileId: "profile-1",
      canOpenProfile: true,
      text: "Привет",
    });
  });

  it("скрывает системные сообщения и оставляет заметку о скрытых", () => {
    const state = createInitialGamesState();
    state.roomChatShowSystemMessages = false;
    state.roomChatMessages = [createRoomSystemMessage("room-1", "Игрок вошел.")];

    const html = renderRoomChatPresenter({
      state,
      room: createRoom(),
      ...createAdapter(),
    });

    expect(html).toContain("Системные сообщения скрыты.");
    expect(html).not.toContain("Игрок вошел.");
  });

  it("не отключает чат публичного лобби для администратора без игроков", () => {
    const state = createInitialGamesState();

    const html = renderRoomChatPresenter({
      state,
      room: createRoom({ isPublicLobby: true, players: [] }),
      ...createAdapter(),
    });

    expect(html).toContain("Сообщений пока нет.");
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("[data-games-room-chat-input]")?.hasAttribute("disabled")).toBe(
      false,
    );
  });
});
