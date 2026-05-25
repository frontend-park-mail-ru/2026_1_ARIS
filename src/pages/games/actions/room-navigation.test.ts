import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { joinGameRoom, leaveGameRoom } from "../../../api/games";
import { backToRooms, returnToRoom } from "./room-navigation";

vi.mock("../../../api/games", () => ({
  joinGameRoom: vi.fn(),
  leaveGameRoom: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов navigation actions. */
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
    players: [],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("room navigation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("выходит из waiting комнаты и загружает список комнат", async () => {
    vi.mocked(leaveGameRoom).mockResolvedValue(undefined);
    const patchGamesState = vi.fn();
    const loadWaitingRooms = vi.fn().mockResolvedValue(undefined);

    await backToRooms({
      room: createRoom(),
      isCurrentRoomCreator: false,
      setPendingVoluntaryLeave: vi.fn(),
      clearPendingVoluntaryLeave: vi.fn(),
      closeRoomSocket: vi.fn(),
      navigateToRoomsRoute: vi.fn(),
      patchGamesState,
      refreshGamesDom: vi.fn(),
      loadWaitingRooms,
      setGamesState: vi.fn(),
    });

    expect(leaveGameRoom).toHaveBeenCalledWith("room-1");
    expect(patchGamesState).toHaveBeenCalledWith(expect.objectContaining({ room: null }));
    expect(loadWaitingRooms).toHaveBeenCalledWith({ preserveMessage: true });
  });

  it("возвращает пользователя в комнату по roomId", async () => {
    vi.mocked(joinGameRoom).mockResolvedValue(createRoom({ id: "room-2" }));
    const setGamesState = vi.fn();
    const navigateToRoom = vi.fn();

    await returnToRoom({
      roomId: "room-2",
      inviteCode: "",
      password: "",
      clearPendingVoluntaryLeave: vi.fn(),
      navigateToRoom,
      setGamesState,
    });

    expect(joinGameRoom).toHaveBeenCalledWith({ roomId: "room-2" });
    expect(navigateToRoom).toHaveBeenCalledWith("room-2");
    expect(setGamesState).toHaveBeenLastCalledWith({
      loading: false,
      message: "",
      messageReturnRoomId: "",
      messageReturnInviteCode: "",
      messageReturnPassword: "",
      messageRefreshRooms: false,
      error: "",
    });
  });

  it("возвращает пользователя в комнату по invite-коду", async () => {
    vi.mocked(joinGameRoom).mockResolvedValue(createRoom({ id: "room-3" }));

    await returnToRoom({
      roomId: "room-3",
      inviteCode: "ABC123",
      password: "secret",
      clearPendingVoluntaryLeave: vi.fn(),
      navigateToRoom: vi.fn(),
      setGamesState: vi.fn(),
    });

    expect(joinGameRoom).toHaveBeenCalledWith({
      inviteCode: "ABC123",
      password: "secret",
    });
  });
});
