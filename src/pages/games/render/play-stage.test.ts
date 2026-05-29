/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { languageStore } from "../../../state/language";
import {
  renderActiveRoundStage,
  renderGameStartingStage,
  renderPauseAction,
  renderPauseStage,
} from "./play-stage";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "1",
    userAccountId: "10",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "female",
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

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const ada = createPlayer();
  const grace = createPlayer({
    profileId: "2",
    userAccountId: "20",
    name: "Grace Hopper",
    firstName: "Grace",
    lastName: "Hopper",
    gender: "female",
    username: "grace",
    isMe: false,
  });

  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: ada.profileId,
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
    creator: ada,
    players: [ada, grace],
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

describe("games play stage render", () => {
  afterEach(() => {
    vi.useRealTimers();
    languageStore.reset({ language: "RU" });
  });

  it("рендерит активный вопрос и ошибку формы ответа", () => {
    const html = renderActiveRoundStage({
      room: createRoom(),
      currentPlayer: createRoom().players[0] ?? null,
      submittedQuestionId: "",
      submittedAnswerValue: "",
      renderInlineError: (target) => `<span data-error="${target}">Ошибка ответа</span>`,
    });

    expect(html).toContain("Текущий вопрос");
    expect(html).toContain("How many moons does Mars have?");
    expect(html).toContain("Введите число");
    expect(html).toContain('data-error="answer"');
  });

  it("рендерит активный вопрос на английском языке интерфейса", () => {
    languageStore.reset({ language: "EN" });

    const html = renderActiveRoundStage({
      room: createRoom(),
      currentPlayer: createRoom().players[0] ?? null,
      submittedQuestionId: "",
      submittedAnswerValue: "",
      renderInlineError: () => "",
    });

    expect(html).toContain("Current question");
    expect(html).toContain("Enter a number");
    expect(html).toContain("Submit answer");
    expect(html).toContain("Time left");
  });

  it("рендерит подтверждение отправленного ответа", () => {
    const room = createRoom({
      currentQuestion: {
        id: "q1",
        position: 1,
        text: "How many moons does Mars have?",
        startedAt: "2026-05-25T00:00:00.000Z",
        deadlineAt: "2026-05-25T00:00:30.000Z",
        hasAnswered: true,
      },
    });
    const html = renderActiveRoundStage({
      room,
      currentPlayer: { ...room.players[0]!, hasAnswered: true },
      submittedQuestionId: "q1",
      submittedAnswerValue: "2",
      renderInlineError: () => "",
    });

    expect(html).toContain("Ваш ответ принят: 2");
    expect(html).toContain("games-answer-form--accepted");
  });

  it("оставляет форму ответа, если сервер пометил вопрос отвеченным чужим ответом", () => {
    const room = createRoom({
      currentQuestion: {
        id: "q1",
        position: 1,
        text: "How many moons does Mars have?",
        startedAt: "2026-05-25T00:00:00.000Z",
        deadlineAt: "2026-05-25T00:00:30.000Z",
        hasAnswered: true,
      },
    });
    const html = renderActiveRoundStage({
      room,
      currentPlayer: room.players[0] ?? null,
      submittedQuestionId: "",
      submittedAnswerValue: "",
      renderInlineError: () => "",
    });

    expect(html).toContain("data-games-answer-input");
    expect(html).not.toContain("games-answer-form--accepted");
  });

  it("показывает вопрос наблюдателю без формы ответа", () => {
    const html = renderActiveRoundStage({
      room: createRoom({ isPublicLobby: true }),
      currentPlayer: null,
      submittedQuestionId: "",
      submittedAnswerValue: "",
      renderInlineError: () => "",
    });

    expect(html).toContain("How many moons does Mars have?");
    expect(html).not.toContain("data-games-answer-form");
  });

  it("рендерит паузу с голосованием за продолжение", () => {
    const room = createRoom({
      pausedByProfileId: "1",
      pauseStartedAt: "2026-05-25T00:00:10.000Z",
      pauseUntilAt: "2026-05-25T00:02:10.000Z",
      pauseForceVotes: 1,
      pauseForceVotesRequired: 2,
      players: [
        createPlayer({ profileId: "1", isMe: false }),
        createPlayer({
          profileId: "2",
          userAccountId: "20",
          name: "Grace Hopper",
          firstName: "Grace",
          lastName: "Hopper",
          username: "grace",
          isMe: true,
        }),
      ],
    });
    const html = renderPauseStage({
      room,
      loading: false,
      pausedByPlayer: room.players[0]!,
      canForceResume: true,
      currentPlayer: room.players[1]!,
    });

    expect(html).toContain("Игра остановлена на 2 минуты");
    expect(html).toContain("1 из 2");
    expect(html).toContain("Продолжить игру принудительно");
    expect(html).toContain("How many moons does Mars have?");
  });

  it("рендерит короткий countdown продолжения паузы полной полоской", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:02:05.100Z"));
    const room = createRoom({
      pausedByProfileId: "1",
      pauseStartedAt: "2026-05-25T00:00:10.000Z",
      pauseUntilAt: "2026-05-25T00:02:10.000Z",
    });

    const html = renderPauseStage({
      room,
      loading: false,
      pausedByPlayer: room.players[0]!,
      canForceResume: false,
      currentPlayer: room.players[0]!,
    });

    expect(html).toContain('data-games-timer-total-ms="5000"');
  });

  it("скрывает кнопку паузы на стартовом countdown и показывает использованную паузу", () => {
    const room = createRoom({
      currentQuestion: null,
      nextQuestionAt: "2026-05-25T00:00:10.000Z",
    });

    expect(
      renderPauseAction({
        room,
        loading: false,
        canPause: true,
        currentPlayer: room.players[0]!,
        isStartCountdown: true,
      }),
    ).toBe("");

    expect(
      renderPauseAction({
        room: createRoom(),
        loading: false,
        canPause: false,
        currentPlayer: createPlayer({ pauseUsed: true }),
        isStartCountdown: false,
      }),
    ).toContain("Пауза уже использована");

    expect(
      renderPauseAction({
        room: createRoom({ isPublicLobby: true }),
        loading: false,
        canPause: true,
        currentPlayer: createPlayer({ pauseUsed: true }),
        isStartCountdown: false,
      }),
    ).toBe("");
  });

  it("рендерит countdown старта игры", () => {
    const html = renderGameStartingStage(
      createRoom({
        currentQuestion: null,
        nextQuestionAt: "2026-05-25T00:00:10.000Z",
      }),
    );

    expect(html).toContain("Игра начинается");
    expect(html).toContain('data-games-timer-deadline="2026-05-25T00:00:10.000Z"');
  });
});
