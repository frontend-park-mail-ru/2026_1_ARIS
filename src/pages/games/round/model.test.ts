import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  getComputedScoresByProfile,
  getComputedWinnerProfileId,
  getRoundPointsByProfile,
  getRoundResultRows,
} from "./model";

/** Создаёт игрока комнаты для проверки scoring-модели. */
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
    hasAnswered: true,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

/** Создаёт комнату с завершёнными вопросами для проверки начисления очков. */
function createRoom(): GameRoom {
  const ada = createPlayer();
  const grace = createPlayer({
    profileId: "2",
    userAccountId: "20",
    name: "Grace Hopper",
    firstName: "Grace",
    lastName: "Hopper",
    username: "grace",
    isMe: false,
  });
  const alan = createPlayer({
    profileId: "3",
    userAccountId: "30",
    name: "Alan Turing",
    firstName: "Alan",
    lastName: "Turing",
    username: "alan",
    isMe: false,
  });

  return {
    id: "room-1",
    title: "",
    inviteCode: "",
    gameType: "number_duel",
    status: "finished",
    createdByProfileId: ada.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 2,
    answerTimeoutSec: 10,
    currentQuestionIndex: 2,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: ada,
    players: [ada, grace, alan],
    currentQuestion: null,
    questions: [
      {
        id: "q1",
        position: 1,
        status: "completed",
        text: "Первый вопрос",
        correctAnswer: 100,
        answerUnit: "",
        answers: [
          {
            profileId: ada.profileId,
            answer: 99,
            distance: 1,
            answeredAt: "",
            responseTimeMs: 1000,
            isWinner: true,
          },
          {
            profileId: grace.profileId,
            answer: 101,
            distance: 1,
            answeredAt: "",
            responseTimeMs: 1004,
            isWinner: true,
          },
          {
            profileId: alan.profileId,
            answer: null,
            distance: null,
            answeredAt: "",
            responseTimeMs: null,
            isWinner: false,
          },
        ],
        winnerProfileId: "",
        startedAt: "2026-05-25T00:00:00.000Z",
        deadlineAt: "2026-05-25T00:00:10.000Z",
        completedAt: "2026-05-25T00:00:10.000Z",
      },
      {
        id: "q2",
        position: 2,
        status: "completed",
        text: "Второй вопрос",
        correctAnswer: 50,
        answerUnit: "",
        answers: [
          {
            profileId: ada.profileId,
            answer: 45,
            distance: 5,
            answeredAt: "",
            responseTimeMs: 800,
            isWinner: false,
          },
          {
            profileId: grace.profileId,
            answer: 54,
            distance: 4,
            answeredAt: "",
            responseTimeMs: 900,
            isWinner: false,
          },
          {
            profileId: alan.profileId,
            answer: 50,
            distance: 0,
            answeredAt: "",
            responseTimeMs: 1200,
            isWinner: true,
          },
        ],
        winnerProfileId: alan.profileId,
        startedAt: "2026-05-25T00:00:11.000Z",
        deadlineAt: "2026-05-25T00:00:21.000Z",
        completedAt: "2026-05-25T00:00:21.000Z",
      },
    ],
    ratingChanges: [],
    winnerProfileId: alan.profileId,
    profileStats: null,
  };
}

describe("games round model", () => {
  it("делит очки между ответами с одинаковой близостью и временем", () => {
    const room = createRoom();
    const question = room.questions[0]!;

    expect(
      getRoundResultRows(room, question).map((row) => [row.player.profileId, row.place]),
    ).toEqual([
      ["1", 1],
      ["2", 1],
      ["3", 3],
    ]);
    expect(Object.fromEntries(getRoundPointsByProfile(room, question))).toEqual({
      "1": 1.5,
      "2": 1.5,
      "3": 0,
    });
  });

  it("считает итоговый счёт и победителя по завершённым вопросам", () => {
    const room = createRoom();

    expect(Object.fromEntries(getComputedScoresByProfile(room))).toEqual({
      "1": 1.5,
      "2": 2.5,
      "3": 2,
    });
    expect(getComputedWinnerProfileId(room)).toBe("2");
  });
});
