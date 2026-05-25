import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import {
  getGameRoom,
  setGameRoomReady,
  setGameRoomReplay,
  updateGameRoomRanked,
} from "../../../api/games";
import { toggleRoomRanked, toggleRoomReady, toggleRoomReplay } from "./room-readiness";

vi.mock("../../../api/games", () => ({
  getGameRoom: vi.fn(),
  setGameRoomReady: vi.fn(),
  setGameRoomReplay: vi.fn(),
  updateGameRoomRanked: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов ready/replay/ranked actions. */
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
        name: "Player",
        firstName: "Player",
        lastName: "",
        gender: "",
        username: "player",
        avatarId: "",
        avatarUrl: "",
        score: 0,
        isReady: false,
        hasAnswered: false,
        pauseUsed: false,
        forceResumeRequested: false,
        isMe: true,
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

/** Создаёт options для тестов ready/replay/ranked actions. */
function createOptions(room: GameRoom, overrides = {}) {
  const options = {
    room,
    getCurrentRoom: () => room,
    currentProfileId: "profile-1",
    currentMessages: [] as GameRoomMessage[],
    hydrateRoom: vi.fn(async (nextRoom: GameRoom) => nextRoom),
    getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    rememberRoomAccess: vi.fn(),
    setGamesState: vi.fn(),
    setPendingRankedToast: vi.fn(),
    showToast: vi.fn(),
    getRankedToastMessage: (isRanked: boolean) => `ranked:${isRanked}`,
    ...overrides,
  };
  return options;
}

describe("room readiness actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("обновляет ready state и refresh комнаты", async () => {
    const room = createRoom();
    const refreshedRoom = createRoom({ players: [{ ...room.players[0]!, isReady: true }] });
    vi.mocked(getGameRoom).mockResolvedValue(refreshedRoom);
    vi.mocked(setGameRoomReady).mockResolvedValue(undefined);
    const options = createOptions(room);

    await toggleRoomReady(true, options);

    expect(setGameRoomReady).toHaveBeenCalledWith("room-1", true);
    expect(options.setGamesState).toHaveBeenLastCalledWith({
      room: refreshedRoom,
      message: "",
      error: "",
      errorTarget: "",
    });
    expect(options.rememberRoomAccess).toHaveBeenCalledWith(refreshedRoom);
  });

  it("откатывает ready optimistic state при ошибке", async () => {
    const room = createRoom();
    vi.mocked(setGameRoomReady).mockRejectedValue(new Error("ready failed"));
    const options = createOptions(room);

    await expect(toggleRoomReady(true, options)).rejects.toThrow("ready failed");

    expect(options.setGamesState).toHaveBeenLastCalledWith({ room });
  });

  it("обновляет replay state только для finished комнаты", async () => {
    const room = createRoom({ status: "finished" });
    const nextRoom = createRoom({ status: "waiting" });
    vi.mocked(setGameRoomReplay).mockResolvedValue(nextRoom);
    const options = createOptions(room);

    await toggleRoomReplay(true, options);

    expect(setGameRoomReplay).toHaveBeenCalledWith("room-1", true);
    expect(options.setGamesState).toHaveBeenLastCalledWith({
      room: nextRoom,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("обновляет ranked mode и ставит pending toast", async () => {
    const room = createRoom();
    const refreshedRoom = createRoom({ isRanked: true });
    vi.mocked(updateGameRoomRanked).mockResolvedValue(undefined);
    vi.mocked(getGameRoom).mockResolvedValue(refreshedRoom);
    const options = createOptions(room);

    await toggleRoomRanked(true, options);

    expect(options.setPendingRankedToast).toHaveBeenCalledWith({
      roomId: "room-1",
      isRanked: true,
    });
    expect(options.showToast).toHaveBeenCalledWith("ranked:true");
    expect(updateGameRoomRanked).toHaveBeenCalledWith("room-1", true);
    expect(options.setGamesState).toHaveBeenLastCalledWith({
      room: refreshedRoom,
      loading: false,
    });
  });
});
