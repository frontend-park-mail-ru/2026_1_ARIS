import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import { isAnswerProgressOnlyRoomUpdate, mergeAnswerProgressRoom } from "./answer-progress";

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

describe("games answer progress", () => {
  it("распознаёт обновление только по состоянию отправленных ответов", () => {
    const previousRoom = createRoom();
    const nextRoom = createRoom({
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        hasAnswered: true,
      },
      players: [createPlayer({ hasAnswered: true })],
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("считает повторный snapshot принятого ответа точечным обновлением", () => {
    const previousRoom = createRoom({
      currentQuestion: {
        ...createRoom().currentQuestion!,
        hasAnswered: true,
      },
      players: [createPlayer({ hasAnswered: true })],
    });
    const nextRoom = createRoom({
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        hasAnswered: true,
      },
      players: [createPlayer({ hasAnswered: true })],
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("считает чужие ответы активного вопроса точечным обновлением", () => {
    const activeQuestion = {
      id: "q1",
      position: 1,
      status: "active" as const,
      text: "Question",
      correctAnswer: null,
      answers: [],
      winnerProfileId: "",
      startedAt: "2026-05-25T00:00:00.000Z",
      deadlineAt: "2026-05-25T00:00:30.000Z",
      completedAt: "",
    };
    const previousRoom = createRoom({
      players: [
        createPlayer({ profileId: "1", hasAnswered: false }),
        createPlayer({ profileId: "2", isMe: false, hasAnswered: false }),
      ],
      questions: [activeQuestion],
    });
    const nextRoom = createRoom({
      players: [
        createPlayer({ profileId: "1", hasAnswered: false }),
        createPlayer({ profileId: "2", isMe: false, hasAnswered: true }),
      ],
      questions: [
        {
          ...activeQuestion,
          answers: [
            {
              profileId: "2",
              answer: 42,
              distance: 0,
              answeredAt: "2026-05-25T00:00:02.000Z",
              responseTimeMs: 2000,
              isWinner: false,
            },
          ],
        },
      ],
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("не пересобирает сцену, если сервер заранее прислал результат активного вопроса", () => {
    const activeQuestion = {
      id: "q1",
      position: 1,
      status: "active" as const,
      text: "Question",
      correctAnswer: null,
      answers: [],
      winnerProfileId: "",
      startedAt: "2026-05-25T00:00:00.000Z",
      deadlineAt: "2026-05-25T00:00:30.000Z",
      completedAt: "",
    };
    const previousRoom = createRoom({ questions: [activeQuestion] });
    const nextRoom = createRoom({
      nextQuestionAt: "2026-05-25T00:00:35.000Z",
      questions: [
        {
          ...activeQuestion,
          status: "completed",
          correctAnswer: 42,
          completedAt: "2026-05-25T00:00:30.000Z",
          winnerProfileId: "2",
          answers: [
            {
              profileId: "2",
              answer: 42,
              distance: 0,
              answeredAt: "2026-05-25T00:00:02.000Z",
              responseTimeMs: 2000,
              isWinner: true,
            },
          ],
        },
      ],
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("не пересобирает форму при служебном сдвиге дедлайна того же активного вопроса", () => {
    const previousRoom = createRoom();
    const nextRoom = createRoom({
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        deadlineAt: "2026-05-25T00:00:29.800Z",
      },
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("не считает смену вопроса частичным прогрессом ответов", () => {
    const previousRoom = createRoom();
    const nextRoom = createRoom({
      currentQuestion: {
        ...previousRoom.currentQuestion!,
        id: "q2",
        position: 2,
        hasAnswered: false,
      },
    });

    expect(isAnswerProgressOnlyRoomUpdate(previousRoom, nextRoom)).toBe(false);
  });

  it("сохраняет текущие очки при слиянии answer-progress обновления", () => {
    const previousRoom = createRoom({
      players: [createPlayer({ profileId: "1", score: 12, hasAnswered: false })],
    });
    const nextRoom = createRoom({
      players: [createPlayer({ profileId: "1", score: 0, hasAnswered: true })],
    });

    const mergedRoom = mergeAnswerProgressRoom(previousRoom, nextRoom);

    expect(mergedRoom.players[0]?.score).toBe(12);
    expect(mergedRoom.players[0]?.hasAnswered).toBe(true);
  });
});
