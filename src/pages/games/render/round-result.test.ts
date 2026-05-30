/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { languageStore } from "../../../state/language";
import { renderRoundResultStage } from "./round-result";

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

function createRoom(status: GameRoom["status"] = "active"): GameRoom {
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
    status,
    createdByProfileId: ada.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 1,
    answerTimeoutSec: 10,
    currentQuestionIndex: 1,
    nextQuestionAt: status === "active" ? "2026-05-25T00:00:15.000Z" : "",
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
        text: "How many moons does Mars have?",
        correctAnswer: 2,
        answers: [
          {
            profileId: ada.profileId,
            answer: 2,
            distance: 0,
            answeredAt: "",
            responseTimeMs: 900,
            isWinner: true,
          },
          {
            profileId: grace.profileId,
            answer: 4,
            distance: 2,
            answeredAt: "",
            responseTimeMs: 800,
            isWinner: false,
          },
          {
            profileId: alan.profileId,
            answer: 0,
            distance: 2,
            answeredAt: "",
            responseTimeMs: 700,
            isWinner: false,
          },
        ],
        winnerProfileId: ada.profileId,
        startedAt: "2026-05-25T00:00:00.000Z",
        deadlineAt: "2026-05-25T00:00:10.000Z",
        completedAt: "2026-05-25T00:00:10.000Z",
      },
    ],
    ratingChanges: [],
    winnerProfileId: ada.profileId,
    profileStats: null,
  };
}

describe("games round result render", () => {
  afterEach(() => {
    vi.useRealTimers();
    languageStore.reset({ language: "RU" });
  });

  it("рендерит раскрытие ответов с таймером полного сценария до следующего вопроса", () => {
    const room = createRoom("active");
    const html = renderRoundResultStage({
      room,
      question: room.questions[0]!,
      renderPlayerCell: (_player, label) => `<span>${label}</span>`,
    });

    expect(html).toContain("Итоги раунда");
    expect(html).toContain("Вопрос 1 из 1");
    expect(html).toContain("How many moons does Mars have?");
    expect(html).toContain("data-games-round-next-timer");
    expect(html).toContain("Следующий вопрос через");
    expect(html).toContain('data-games-timer-deadline="2026-05-25T00:00:15.000Z"');
    expect(html).toContain('data-games-timer-start="2026-05-25T00:00:10.000Z"');
    expect(html).toContain('data-games-timer-total-ms="5000"');
    expect(html).toContain("Правильный ответ: 2");
    expect(html).not.toContain("games-answer-axis-card--correct");
    expect(html).toContain("Ada");
    expect(html).toContain("Lovelace");
    expect(html).toContain("Alan");
    expect(html).toContain("Turing");
    expect(html).toContain("0.90 сек");
    expect(html).toContain("0.70 сек");
    expect(html).toContain("0.80 сек");

    document.body.innerHTML = html;
    const cards = [...document.querySelectorAll("[data-games-round-result-card]")];
    const cardTexts = cards.map((card) => card.textContent?.replace(/\s+/g, " ").trim() ?? "");
    expect(cardTexts[0]).toContain("Ada");
    expect(cardTexts[0]).toContain("Lovelace");
    expect(cardTexts[0]).toContain("0.90 сек");
    expect(cardTexts[1]).toContain("Alan");
    expect(cardTexts[1]).toContain("Turing");
    expect(cardTexts[1]).toContain("-2");
    expect(cardTexts[1]).toContain("0.70 сек");
    expect(cardTexts[2]).toContain("Grace");
    expect(cardTexts[2]).toContain("Hopper");
    expect(cardTexts[2]).toContain("+2");
    expect(cardTexts[2]).toContain("0.80 сек");
  });

  it("рендерит итоги раунда на английском языке интерфейса", () => {
    languageStore.reset({ language: "EN" });
    const room = createRoom("active");
    const html = renderRoundResultStage({
      room,
      question: room.questions[0]!,
      renderPlayerCell: (_player, label) => `<span>${label}</span>`,
    });

    expect(html).toContain("Round results");
    expect(html).toContain("Question 1 of 1");
    expect(html).toContain("Next question in");
  });

  it("показывает таймер активного результата без серверного nextQuestionAt", () => {
    const room = createRoom("active");
    room.nextQuestionAt = "";
    const html = renderRoundResultStage({
      room,
      question: room.questions[0]!,
      renderPlayerCell: (_player, label) => `<span>${label}</span>`,
    });

    expect(html).toContain("data-games-round-next-timer");
    expect(html).toContain("Следующий вопрос через");
    expect(html).toContain('data-games-timer-deadline="2026-05-25T00:00:15.000Z"');
  });

  it("рендерит hidden-маркер окна финальных итогов", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:12.000Z"));
    const room = createRoom("finished");
    const html = renderRoundResultStage({
      room,
      question: room.questions[0]!,
      renderPlayerCell: (_player, label) => `<span>${label}</span>`,
    });

    expect(html).toContain("data-games-final-results-until");
    expect(html).toContain("data-games-round-next-timer");
    expect(html).toContain("Итоги игры через");
  });
});
