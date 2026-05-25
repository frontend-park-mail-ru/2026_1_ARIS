/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import { ApiError } from "../../../api/core/client";
import { createGamesRoomChatRuntime, type CreateGamesRoomChatRuntimeOptions } from "./room-chat";

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

function createOptions(
  overrides: Partial<CreateGamesRoomChatRuntimeOptions> & { room?: GameRoom | null } = {},
): CreateGamesRoomChatRuntimeOptions {
  let room = overrides.room === undefined ? createRoom() : overrides.room;
  const messages: GameRoomMessage[] = [];
  return {
    getRoom: () => room,
    getSocketOpen: vi.fn(() => false),
    getMessages: () => messages,
    getLoading: vi.fn(() => false),
    fetchMessages: vi.fn(async () => [createMessage()]),
    getStoredSystemMessages: vi.fn(() => []),
    mergeMessages: vi.fn((existing, incoming) => [...existing, ...incoming]),
    hydrateAuthorAvatars: vi.fn(async () => ["avatar.png"]),
    prepareAvatarLinks: vi.fn(),
    canRecoverAccess: vi.fn(() => false),
    recoverAccess: vi.fn(async () => null),
    clearAccessRecovery: vi.fn(),
    setRecoveredRoom: vi.fn((nextRoom) => {
      room = nextRoom;
    }),
    setChatState: vi.fn((patch) => {
      if (patch.roomChatMessages) {
        messages.splice(0, messages.length, ...patch.roomChatMessages);
      }
    }),
    handleUnavailable: vi.fn(),
    formatError: vi.fn(() => "Ошибка чата"),
    ...overrides,
  };
}

describe("games room chat runtime", () => {
  it("загружает сообщения и объединяет их с текущим состоянием", async () => {
    const options = createOptions();
    const runtime = createGamesRoomChatRuntime(options);

    await runtime.loadMessages("room-1");

    expect(options.fetchMessages).toHaveBeenCalledWith("room-1", {
      limit: 300,
      offset: 0,
    });
    expect(options.hydrateAuthorAvatars).toHaveBeenCalled();
    expect(options.prepareAvatarLinks).toHaveBeenCalledWith(["avatar.png"]);
    expect(options.setChatState).toHaveBeenLastCalledWith({
      roomChatMessages: [expect.objectContaining({ id: "message-1" })],
      roomChatLoading: false,
      roomChatError: "",
    });
  });

  it("сбрасывает чат, если активной комнаты нет", () => {
    const options = createOptions({ room: null });
    const runtime = createGamesRoomChatRuntime(options);

    runtime.sync();

    expect(options.setChatState).toHaveBeenCalledWith({
      roomChatMessages: [],
      roomChatLoading: false,
      roomChatSending: false,
      roomChatError: "",
      roomChatDraft: "",
    });
  });

  it("стартует polling и останавливает его при stop", () => {
    vi.useFakeTimers();
    const options = createOptions({
      fetchMessages: vi.fn(async () => []),
    });
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const runtime = createGamesRoomChatRuntime(options);

    runtime.sync();
    vi.advanceTimersByTime(8000);

    expect(options.fetchMessages).toHaveBeenCalledWith("room-1", {
      limit: 300,
      offset: 0,
      signal: expect.any(AbortSignal),
    });
    expect(options.fetchMessages).toHaveBeenCalledWith("room-1", {
      limit: 300,
      offset: 0,
    });
    runtime.stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("пытается восстановить доступ при 403 без открытого сокета", async () => {
    const recoveredRoom = createRoom({ title: "Recovered" });
    let fetchCallCount = 0;
    const fetchMessages = vi.fn(async () => {
      fetchCallCount += 1;
      if (fetchCallCount === 1) {
        throw new ApiError("forbidden", 403, {});
      }
      return [];
    });
    const options = createOptions({
      fetchMessages,
      canRecoverAccess: vi.fn(() => true),
      recoverAccess: vi.fn(async () => recoveredRoom),
    });
    const runtime = createGamesRoomChatRuntime(options);

    await runtime.loadMessages("room-1");
    await Promise.resolve();

    expect(options.recoverAccess).toHaveBeenCalledWith("room-1");
    expect(options.clearAccessRecovery).toHaveBeenCalledWith("room-1");
    expect(options.setRecoveredRoom).toHaveBeenCalledWith(recoveredRoom);
    expect(options.setChatState).toHaveBeenCalledWith(
      {
        roomChatLoading: false,
        roomChatError: "Идет загрузка сообщений...",
      },
      { scrollToBottom: false },
    );
  });
});
