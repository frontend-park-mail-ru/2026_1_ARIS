import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  disbandGameRoom,
  forgetPublicGameGuestSession,
  getPublicGameGuestSessionByRoom,
  leaveGameRoom,
} from "../../../api/games";
import { disbandCurrentRoom, exitRoomToMenu } from "./room-lifecycle";

vi.mock("../../../api/games", () => ({
  disbandGameRoom: vi.fn(),
  forgetPublicGameGuestSession: vi.fn(),
  getPublicGameGuestSessionByRoom: vi.fn(),
  leaveGameRoom: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов lifecycle actions. */
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
        name: "Creator",
        firstName: "Creator",
        lastName: "",
        gender: "",
        username: "creator",
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

describe("room lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicGameGuestSessionByRoom).mockReturnValue(null);
  });

  it("распускает комнату создателя и закрывает socket", async () => {
    vi.mocked(disbandGameRoom).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const closeRoomSocket = vi.fn();
    const navigateAfterDisband = vi.fn();

    await disbandCurrentRoom({
      room: createRoom(),
      currentProfileId: "profile-1",
      clearPendingVoluntaryLeave: vi.fn(),
      forgetRoomAccess: vi.fn(),
      closeRoomSocket,
      navigateAfterDisband,
      setGamesState,
    });

    expect(disbandGameRoom).toHaveBeenCalledWith("room-1");
    expect(closeRoomSocket).toHaveBeenCalled();
    expect(navigateAfterDisband).toHaveBeenCalled();
  });

  it("не распускает комнату для неадминистратора", async () => {
    const setGamesState = vi.fn();

    await disbandCurrentRoom({
      room: createRoom({ createdByProfileId: "profile-2" }),
      currentProfileId: "profile-1",
      clearPendingVoluntaryLeave: vi.fn(),
      forgetRoomAccess: vi.fn(),
      closeRoomSocket: vi.fn(),
      navigateAfterDisband: vi.fn(),
      setGamesState,
    });

    expect(disbandGameRoom).not.toHaveBeenCalled();
    expect(setGamesState).toHaveBeenCalledWith({
      message: "",
      error: "Распустить комнату может только администратор.",
      errorTarget: "footer",
    });
  });

  it("выводит игрока из waiting комнаты перед возвратом в меню", async () => {
    vi.mocked(leaveGameRoom).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const resetGamesState = vi.fn();
    const navigateToGamesMenu = vi.fn();

    await exitRoomToMenu({
      room: createRoom({ createdByProfileId: "profile-2" }),
      currentProfileId: "profile-1",
      forgetRoomAccess: vi.fn(),
      closeRoomSocket: vi.fn(),
      stopRoomChat: vi.fn(),
      resetGamesState,
      navigateToGamesMenu,
      setGamesState,
    });

    expect(leaveGameRoom).toHaveBeenCalledWith("room-1");
    expect(resetGamesState).toHaveBeenCalled();
    expect(navigateToGamesMenu).toHaveBeenCalled();
  });

  it("откатывает loading при ошибке выхода из комнаты", async () => {
    vi.mocked(leaveGameRoom).mockRejectedValue(new Error("leave failed"));
    const setGamesState = vi.fn();

    await expect(
      exitRoomToMenu({
        room: createRoom({ createdByProfileId: "profile-2" }),
        currentProfileId: "profile-1",
        forgetRoomAccess: vi.fn(),
        closeRoomSocket: vi.fn(),
        stopRoomChat: vi.fn(),
        resetGamesState: vi.fn(),
        navigateToGamesMenu: vi.fn(),
        setGamesState,
      }),
    ).rejects.toThrow("leave failed");

    expect(setGamesState).toHaveBeenLastCalledWith({
      loading: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("очищает гостевую публичную сессию при выходе из публичной игры", async () => {
    const session = { inviteCode: "ABC123", roomId: "room-1", token: "guest-token" };
    vi.mocked(getPublicGameGuestSessionByRoom).mockReturnValue(session);
    const navigateToGamesMenu = vi.fn();

    await exitRoomToMenu({
      room: createRoom({ status: "active", isPublicLobby: true }),
      currentProfileId: "profile-1",
      forgetRoomAccess: vi.fn(),
      closeRoomSocket: vi.fn(),
      stopRoomChat: vi.fn(),
      resetGamesState: vi.fn(),
      navigateToGamesMenu,
      setGamesState: vi.fn(),
    });

    expect(getPublicGameGuestSessionByRoom).toHaveBeenCalledWith("room-1");
    expect(forgetPublicGameGuestSession).toHaveBeenCalledWith(session);
    expect(leaveGameRoom).not.toHaveBeenCalled();
    expect(navigateToGamesMenu).toHaveBeenCalled();
  });
});
