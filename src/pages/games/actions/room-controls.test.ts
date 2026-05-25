import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { forceResumeGameRoom, pauseGameRoom, startGameRoom } from "../../../api/games";
import { forceResumeCurrentRoom, pauseCurrentRoom, startCurrentRoom } from "./room-controls";

vi.mock("../../../api/games", () => ({
  pauseGameRoom: vi.fn(),
  forceResumeGameRoom: vi.fn(),
  startGameRoom: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов room-control actions. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: "profile-1",
    maxPlayers: 2,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 30,
    currentQuestionIndex: 1,
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
        isReady: true,
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

describe("room control actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ставит активную комнату на паузу", async () => {
    const room = createRoom();
    const nextRoom = createRoom({ pausedByProfileId: "profile-1", pauseUntilAt: "2030-01-01" });
    vi.mocked(pauseGameRoom).mockResolvedValue(nextRoom);
    const setGamesState = vi.fn();

    await pauseCurrentRoom({ room, setGamesState });

    expect(pauseGameRoom).toHaveBeenCalledWith("room-1");
    expect(setGamesState).toHaveBeenLastCalledWith({
      room: nextRoom,
      loading: false,
      message: "Игра поставлена на паузу.",
      error: "",
      errorTarget: "",
    });
  });

  it("не голосует за продолжение, если комната не на паузе", async () => {
    const setGamesState = vi.fn();

    await forceResumeCurrentRoom({ room: createRoom(), setGamesState });

    expect(forceResumeGameRoom).not.toHaveBeenCalled();
    expect(setGamesState).not.toHaveBeenCalled();
  });

  it("голосует за досрочное продолжение паузы", async () => {
    const room = createRoom({
      pausedByProfileId: "profile-2",
      pauseUntilAt: "2030-01-01",
    });
    const nextRoom = createRoom({ pauseForceVotes: 1 });
    vi.mocked(forceResumeGameRoom).mockResolvedValue(nextRoom);
    const setGamesState = vi.fn();

    await forceResumeCurrentRoom({ room, setGamesState });

    expect(forceResumeGameRoom).toHaveBeenCalledWith("room-1");
    expect(setGamesState).toHaveBeenLastCalledWith({
      room: nextRoom,
      loading: false,
      message: "Голос за продолжение учтен.",
      error: "",
      errorTarget: "",
    });
  });

  it("запускает комнату и добавляет системные сообщения", async () => {
    const room = createRoom({ status: "waiting" });
    const nextRoom = createRoom({ status: "active" });
    const systemMessage = { id: "msg-1", roomId: "room-1", text: "Started" } as GameRoomMessage;
    vi.mocked(startGameRoom).mockResolvedValue(nextRoom);
    const setGamesState = vi.fn();

    await startCurrentRoom({
      room,
      currentMessages: [],
      getSystemMessages: () => [systemMessage],
      mergeMessages: (_existing, incoming) => incoming,
      setGamesState,
    });

    expect(startGameRoom).toHaveBeenCalledWith("room-1");
    expect(setGamesState).toHaveBeenLastCalledWith({
      room: nextRoom,
      loading: false,
      startConfirmOpen: false,
      kickConfirmProfileId: "",
      error: "",
      errorTarget: "",
      message: "",
      roomChatMessages: [systemMessage],
    });
  });
});
