/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  buildQuestionReportDescription,
  createQuestionReportUi,
  findReportableQuestion,
  getQuestionClipboardText,
  getQuestionReportKey,
  renderQuestionReportButton,
  truncateQuestionReportText,
} from "./question-report";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "42",
    userAccountId: "420",
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

function createRoom(): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Test room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "finished",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 1,
    answerTimeoutSec: 10,
    currentQuestionIndex: 1,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
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
            profileId: player.profileId,
            answer: 3,
            distance: 1,
            answeredAt: "",
            responseTimeMs: 1200,
            isWinner: false,
          },
        ],
        winnerProfileId: "",
        startedAt: "",
        deadlineAt: "",
        completedAt: "",
      },
    ],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
  };
}

describe("games question report", () => {
  it("ищет вопрос по стабильному ключу", () => {
    const room = createRoom();
    const question = room.questions[0]!;
    const key = getQuestionReportKey(room, question);

    expect(key).toBe("room-1:q1");
    expect(findReportableQuestion(room, key)).toBe(question);
  });

  it("готовит clipboard и support-текст жалобы", () => {
    const room = createRoom();
    const question = room.questions[0]!;

    expect(getQuestionClipboardText(question)).toContain("Правильный ответ: 2");
    expect(truncateQuestionReportText("a  b  c", 4)).toBe("a b…");
    expect(
      buildQuestionReportDescription({
        room,
        question,
        user: { id: "42", login: "ada", firstName: "Ada", lastName: "", email: "" },
        pageUrl: "http://localhost/games/quiz/room-1",
        reportedAt: new Date("2026-05-25T00:00:00.000Z"),
      }),
    ).toContain("Ответ пользователя: 3");
  });

  it("рендерит заблокированную кнопку для уже отправленной жалобы", () => {
    const room = createRoom();
    const question = room.questions[0]!;
    const key = getQuestionReportKey(room, question);
    const html = renderQuestionReportButton({
      room,
      question,
      state: {
        reportingKeys: new Set(),
        reportedKeys: new Set([key]),
      },
    });

    expect(html).toContain("disabled");
    expect(html).toContain("Жалоба отправлена");
  });

  it("синхронизирует DOM-кнопки жалобы через UI-модель", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <button data-games-report-question="room-1:q1">Пожаловаться на вопрос</button>
      <button data-games-report-question="room-1:q2">Пожаловаться на вопрос</button>
    `;
    const reportingKeys = new Set(["room-1:q1"]);
    const ui = createQuestionReportUi({
      getRoot: () => root,
      reportingKeys,
      reportedKeys: new Set(),
      getOpenQuestionKey: () => "room-1:q1",
    });

    ui.syncButtons("room-1:q1");

    const button = root.querySelector<HTMLButtonElement>(
      '[data-games-report-question="room-1:q1"]',
    )!;
    const otherButton = root.querySelector<HTMLButtonElement>(
      '[data-games-report-question="room-1:q2"]',
    )!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Отправляем...");
    expect(otherButton.disabled).toBe(false);
  });
});
