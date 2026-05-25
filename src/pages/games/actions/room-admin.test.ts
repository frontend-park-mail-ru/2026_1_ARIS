import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { assignGameRoomAdmin, kickGameRoomPlayer } from "../../../api/games";
import { assignRoomAdmin, kickRoomPlayer } from "./room-admin";

vi.mock("../../../api/games", () => ({
  assignGameRoomAdmin: vi.fn(),
  kickGameRoomPlayer: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов admin actions. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: "profile-1",
    maxPlayers: 2,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 30,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 1,
    creator: null,
    players: [
      {
        profileId: "profile-1",
        userAccountId: "user-1",
        name: "Admin",
        firstName: "Admin",
        lastName: "",
        gender: "",
        username: "admin",
        avatarId: "",
        avatarUrl: "",
        score: 0,
        isReady: false,
        hasAnswered: false,
        pauseUsed: false,
        forceResumeRequested: false,
        isMe: true,
      },
      {
        profileId: "profile-2",
        userAccountId: "user-2",
        name: "Guest",
        firstName: "Guest",
        lastName: "",
        gender: "",
        username: "guest",
        avatarId: "",
        avatarUrl: "",
        score: 0,
        isReady: false,
        hasAnswered: false,
        pauseUsed: false,
        forceResumeRequested: false,
        isMe: false,
      },
    ],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("room admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("удаляет игрока и обновляет локальный состав", async () => {
    const room = createRoom();
    vi.mocked(kickGameRoomPlayer).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const refreshCurrentRoom = vi.fn().mockResolvedValue(undefined);

    await kickRoomPlayer({
      room,
      profileId: "profile-2",
      getCurrentRoom: () => room,
      currentMessages: [],
      getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
      mergeMessages: (_existing, incoming) => incoming,
      rememberRoomAccess: vi.fn(),
      refreshCurrentRoom,
      setGamesState,
    });

    expect(kickGameRoomPlayer).toHaveBeenCalledWith("room-1", "profile-2");
    expect(setGamesState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        room: expect.objectContaining({
          players: [room.players[0]],
        }),
        kickConfirmProfileId: "",
        playerMenuProfileId: "",
        loading: false,
        errorTarget: "",
      }),
    );
    expect(refreshCurrentRoom).toHaveBeenCalled();
  });

  it("не пишет локальный состав, если пользователь уже в другой комнате", async () => {
    const room = createRoom();
    vi.mocked(kickGameRoomPlayer).mockResolvedValue(undefined);
    const setGamesState = vi.fn();

    await kickRoomPlayer({
      room,
      profileId: "profile-2",
      getCurrentRoom: () => createRoom({ id: "room-2" }),
      currentMessages: [],
      getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
      mergeMessages: (_existing, incoming) => incoming,
      rememberRoomAccess: vi.fn(),
      refreshCurrentRoom: vi.fn().mockResolvedValue(undefined),
      setGamesState,
    });

    expect(setGamesState).toHaveBeenCalledTimes(1);
  });

  it("назначает администратора и refresh-ит комнату", async () => {
    const room = createRoom();
    vi.mocked(assignGameRoomAdmin).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const refreshCurrentRoom = vi.fn().mockResolvedValue(undefined);

    await assignRoomAdmin({
      room,
      profileId: "profile-2",
      refreshCurrentRoom,
      setGamesState,
    });

    expect(assignGameRoomAdmin).toHaveBeenCalledWith("room-1", "profile-2");
    expect(setGamesState).toHaveBeenLastCalledWith({
      adminConfirmProfileId: "",
      playerMenuProfileId: "",
      loading: false,
      errorTarget: "",
    });
    expect(refreshCurrentRoom).toHaveBeenCalled();
  });
});
