/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import {
  renderGamePlayPresenter,
  renderGameStagePresenter,
  renderPauseActionPresenter,
} from "./game-stage";

/** Создаёт игрока для тестов presenter игровой сцены. */
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

/** Создаёт комнату для тестов presenter игровой сцены. */
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
      text: "How many moons does Mars have?",
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

/** Создаёт зависимости presenter игровой сцены. */
function createOptions(room = createRoom()) {
  return {
    state: createInitialGamesState(),
    room,
    getCurrentPlayer: () => room.players[0] ?? null,
    getCurrentRoomPlayer: () => room.players[0] ?? null,
    getPausedByPlayer: () => room.players[0] ?? null,
    canCurrentPlayerPause: () => true,
    canCurrentPlayerForceResume: () => true,
    getPlayerAvatarUrl: () => "",
    renderInlineError: (target: string) => `<span data-error="${target}">Ошибка</span>`,
    renderQuestionActionsMenuButton: (_room: GameRoom, question: { id: string }) =>
      `<button data-question="${question.id}">menu</button>`,
  };
}

describe("games game-stage presenter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("рендерит активный вопрос через presenter", () => {
    const html = renderGamePlayPresenter(createOptions());

    expect(html).toContain("games-game-shell");
    expect(html).toContain("Текущий вопрос");
    expect(html).toContain("How many moons does Mars have?");
  });

  it("выбирает экран стартового countdown", () => {
    const room = createRoom({
      currentQuestion: null,
      nextQuestionAt: "2026-05-25T00:00:10.000Z",
    });

    const html = renderGameStagePresenter(createOptions(room));

    expect(html).toContain("Игра начинается");
    expect(html).toContain('data-games-timer-deadline="2026-05-25T00:00:10.000Z"');
  });

  it("показывает результат раунда до серверного nextQuestionAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:10.000Z"));
    const room = createRoom({
      currentQuestionIndex: 2,
      currentQuestion: null,
      nextQuestionAt: "2026-05-25T00:00:12.000Z",
      questions: [
        {
          id: "q1",
          position: 1,
          status: "completed",
          text: "Completed question",
          correctAnswer: 42,
          answers: [],
          winnerProfileId: "",
          startedAt: "2026-05-25T00:00:00.000Z",
          deadlineAt: "2026-05-25T00:00:10.000Z",
          completedAt: "2026-05-25T00:00:00.000Z",
        },
      ],
    });

    const html = renderGameStagePresenter(createOptions(room));

    expect(html).toContain("Completed question");
    expect(html).toContain("Следующий вопрос через");
    expect(html).toContain('data-games-timer-deadline="2026-05-25T00:00:12.000Z"');
  });

  it("рендерит pause-action с текущим игроком", () => {
    const html = renderPauseActionPresenter(createOptions());

    expect(html).toContain("Пауза");
    expect(html).toContain("data-games-pause-room");
  });
});
