import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { acceptCurrentAnswerLocally } from "./answer-local";

/** Создаёт комнату с активным вопросом для локального принятия ответа. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: "1",
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 3,
    answerTimeoutSec: 30,
    currentQuestionIndex: 1,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: null,
    players: [
      {
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
      },
    ],
    currentQuestion: {
      id: "q1",
      position: 1,
      text: "Question",
      answerUnit: "",
      startedAt: "",
      deadlineAt: "",
      hasAnswered: false,
    },
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("games answer local action", () => {
  it("помечает текущий ответ принятым и синхронизирует DOM-точки", () => {
    const patchGamesState = vi.fn();
    const syncCurrentAnswerFormDom = vi.fn();
    const syncPlayersRailAnswerDom = vi.fn();
    const currentRoom = createRoom();
    const incomingRoom = createRoom({
      players: [{ ...currentRoom.players[0]!, hasAnswered: false, score: 0 }],
    });

    acceptCurrentAnswerLocally({
      answer: 42,
      currentRoom,
      incomingRoom,
      setGamesState: vi.fn(),
      patchGamesState,
      syncCurrentAnswerFormDom,
      syncPlayersRailAnswerDom,
    });

    expect(patchGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedQuestionId: "q1",
        submittedAnswerValue: "42",
        room: expect.objectContaining({
          currentQuestion: expect.objectContaining({ hasAnswered: true }),
          players: [expect.objectContaining({ hasAnswered: true })],
        }),
      }),
    );
    expect(syncCurrentAnswerFormDom).toHaveBeenCalledTimes(1);
    expect(syncPlayersRailAnswerDom).toHaveBeenCalledWith(
      expect.objectContaining({
        currentQuestion: expect.objectContaining({ hasAnswered: true }),
      }),
    );
  });

  it("не перерисовывает комнату полностью, если incoming-комната не совпадает с текущим вопросом", () => {
    const setGamesState = vi.fn();
    const patchGamesState = vi.fn();
    const syncCurrentAnswerFormDom = vi.fn();
    const currentRoom = createRoom();
    const incomingRoom = createRoom({
      currentQuestion: { ...currentRoom.currentQuestion!, id: "q2" },
    });

    acceptCurrentAnswerLocally({
      answer: 7,
      currentRoom,
      incomingRoom,
      setGamesState,
      patchGamesState,
      syncCurrentAnswerFormDom,
      syncPlayersRailAnswerDom: vi.fn(),
    });

    expect(setGamesState).not.toHaveBeenCalled();
    expect(patchGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedQuestionId: "q1",
        submittedAnswerValue: "7",
        room: expect.objectContaining({
          currentQuestion: expect.objectContaining({ id: "q1", hasAnswered: true }),
        }),
      }),
    );
    expect(syncCurrentAnswerFormDom).toHaveBeenCalledTimes(1);
  });
});
