import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import { getRoomSocketStateUpdate } from "./socket-state";

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
    score: 5,
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
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: player.profileId,
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
    creator: player,
    players: [player],
    currentQuestion: {
      id: "q1",
      position: 1,
      text: "Question",
      startedAt: "2026-05-25T00:00:00.000Z",
      deadlineAt: "2026-05-25T00:00:30.000Z",
      hasAnswered: false,
    },
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("games room socket state", () => {
  it("готовит answer-progress update без полного rerender", () => {
    const previousRoom = createRoom({
      players: [createPlayer({ score: 12, hasAnswered: false })],
    });
    const incomingRoom = createRoom({
      players: [createPlayer({ score: 0, hasAnswered: true })],
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        hasAnswered: true,
      },
    });

    const update = getRoomSocketStateUpdate({
      previousRoom,
      incomingRoom,
      currentProfileId: "1",
      submittedQuestionId: "q1",
      submittedAnswerValue: "42",
      getSystemMessages: vi.fn(() => []),
    });

    expect(update.isAnswerProgressOnly).toBe(true);
    expect(update.currentQuestionAnswerChanged).toBe(true);
    expect(update.stateRoom.players[0]?.score).toBe(12);
    expect(update.submittedQuestionId).toBe("q1");
    expect(update.submittedAnswerValue).toBe("42");
  });

  it("сбрасывает submitted answer при смене вопроса", () => {
    const previousRoom = createRoom();
    const incomingRoom = createRoom({
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        id: "q2",
        position: 2,
      },
    });

    const update = getRoomSocketStateUpdate({
      previousRoom,
      incomingRoom,
      currentProfileId: "1",
      submittedQuestionId: "q1",
      submittedAnswerValue: "42",
      getSystemMessages: vi.fn(() => []),
    });

    expect(update.submittedQuestionId).toBe("");
    expect(update.submittedAnswerValue).toBe("");
  });

  it("распознаёт назначение текущего пользователя администратором", () => {
    const previousRoom = createRoom({
      createdByProfileId: "2",
      players: [createPlayer(), createPlayer({ profileId: "2", isMe: false })],
    });
    const incomingRoom = createRoom({
      createdByProfileId: "1",
      players: previousRoom.players,
    });

    const update = getRoomSocketStateUpdate({
      previousRoom,
      incomingRoom,
      currentProfileId: "1",
      submittedQuestionId: "",
      submittedAnswerValue: "",
      getSystemMessages: vi.fn(() => []),
    });

    expect(update.becameAdmin).toBe(true);
  });

  it("сбрасывает готовность при смене ranked-режима в lobby", () => {
    const previousRoom = createRoom({
      status: "waiting",
      isRanked: false,
      players: [createPlayer({ isReady: true })],
    });
    const incomingRoom = createRoom({
      status: "waiting",
      isRanked: true,
      players: [createPlayer({ isReady: true })],
    });

    const update = getRoomSocketStateUpdate({
      previousRoom,
      incomingRoom,
      currentProfileId: "1",
      submittedQuestionId: "",
      submittedAnswerValue: "",
      getSystemMessages: vi.fn(() => []),
    });

    expect(update.rankedChanged).toBe(true);
    expect(update.normalizedRoom.players[0]?.isReady).toBe(false);
  });
});
