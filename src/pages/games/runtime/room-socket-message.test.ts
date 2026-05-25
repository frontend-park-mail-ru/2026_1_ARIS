import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import {
  handleRoomSocketMessage,
  type HandleRoomSocketMessageOptions,
} from "./room-socket-message";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "1",
    userAccountId: "10",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "",
    username: "ada",
    avatarId: "",
    avatarUrl: "",
    score: 0,
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 3,
    answerTimeoutSec: 30,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

function createMessage(overrides: Partial<GameRoomMessage> = {}): GameRoomMessage {
  return {
    id: "message-1",
    roomId: "room-1",
    authorProfileId: "1",
    authorUserAccountId: "10",
    authorName: "Ada Lovelace",
    authorFirstName: "Ada",
    authorLastName: "Lovelace",
    authorUsername: "ada",
    authorAvatarId: "",
    authorAvatarUrl: "",
    text: "Привет",
    createdAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function createOptions(room: GameRoom | null = createRoom()): HandleRoomSocketMessageOptions {
  const messages: GameRoomMessage[] = [];
  return {
    getRoom: () => room,
    getMessages: () => messages,
    rememberDisconnectRemoval: vi.fn(),
    getAuthorAvatar: vi.fn(() => "avatar.png"),
    hydrateAuthorAvatars: vi.fn(async () => ["avatar-hydrated.png"]),
    prepareAvatarLinks: vi.fn(),
    refreshChat: vi.fn(),
    mergeMessages: vi.fn((existing, incoming) => [...existing, ...incoming]),
    setChatState: vi.fn((patch) => {
      if (patch.roomChatMessages) {
        messages.splice(0, messages.length, ...patch.roomChatMessages);
      }
    }),
  };
}

describe("games room socket message", () => {
  it("добавляет сообщение активной комнаты в чат", () => {
    const options = createOptions();

    handleRoomSocketMessage(createMessage(), options);

    expect(options.rememberDisconnectRemoval).toHaveBeenCalledWith(
      expect.objectContaining({ id: "message-1" }),
    );
    expect(options.setChatState).toHaveBeenCalledWith(
      {
        roomChatMessages: [expect.objectContaining({ id: "message-1" })],
        roomChatError: "",
      },
      { scrollToBottom: true, forceScrollToBottom: true },
    );
  });

  it("игнорирует сообщение другой комнаты", () => {
    const options = createOptions();

    handleRoomSocketMessage(createMessage({ roomId: "room-2" }), options);

    expect(options.setChatState).not.toHaveBeenCalled();
    expect(options.rememberDisconnectRemoval).not.toHaveBeenCalled();
  });

  it("добавляет roomId к сообщению без roomId", () => {
    const options = createOptions();

    handleRoomSocketMessage(createMessage({ roomId: "" }), options);

    expect(options.setChatState).toHaveBeenCalledWith(
      {
        roomChatMessages: [expect.objectContaining({ roomId: "room-1" })],
        roomChatError: "",
      },
      { scrollToBottom: true, forceScrollToBottom: true },
    );
  });
});
