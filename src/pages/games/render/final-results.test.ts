/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { languageStore } from "../../../state/language";
import { renderFinalGameStage } from "./final-results";

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
    isReady: false,
    hasAnswered: true,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const ada = createPlayer({ score: 2, isReady: true });
  const grace = createPlayer({
    profileId: "2",
    userAccountId: "20",
    name: "Grace Hopper",
    firstName: "Grace",
    lastName: "Hopper",
    username: "grace",
    score: 0,
    isMe: false,
  });
  return {
    id: "room-1",
    title: "Final room",
    inviteCode: "",
    gameType: "number_duel",
    status: "finished",
    createdByProfileId: ada.profileId,
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
    creator: ada,
    players: [ada, grace],
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
        ],
        winnerProfileId: ada.profileId,
        startedAt: "",
        deadlineAt: "",
        completedAt: "",
      },
    ],
    ratingChanges: [],
    winnerProfileId: ada.profileId,
    profileStats: null,
    ...overrides,
  };
}

const renderProfileLink = (options: { profileId: string; className: string; content: string }) =>
  `<a href="/id${options.profileId}" class="${options.className}">${options.content}</a>`;

function renderFinal(room: GameRoom): string {
  return renderFinalGameStage({
    room,
    currentPlayer: room.players[0] ?? null,
    loading: false,
    getPlayerAvatarUrl: () => "",
    renderProfileLink,
    renderQuestionActionsMenuButton: (_room, question) =>
      `<button data-question="${question.id}">menu</button>`,
  });
}

describe("games final results render", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("рендерит победителя, таблицу участников и архив вопросов", () => {
    const html = renderFinal(createRoom());

    expect(html).toContain("Победитель");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Таблица участников");
    expect(html).toContain("Баллы");
    expect(html).toContain("Суммарное время");
    expect(html).toContain("Время");
    expect(html).toContain("0.90 сек");
    expect(html).toContain("How many moons does Mars have?");
    expect(html).not.toContain("data-games-replay-toggle");
  });

  it("сортирует финальную таблицу по времени при равных очках", () => {
    const baseRoom = createRoom();
    const room = createRoom({
      questionCount: 2,
      currentQuestionIndex: 2,
      questions: [
        baseRoom.questions[0]!,
        {
          ...baseRoom.questions[0]!,
          id: "q2",
          position: 2,
          text: "Second question",
          answers: [
            {
              profileId: "1",
              answer: 10,
              distance: 8,
              answeredAt: "",
              responseTimeMs: 900,
              isWinner: false,
            },
            {
              profileId: "2",
              answer: 2,
              distance: 0,
              answeredAt: "",
              responseTimeMs: 700,
              isWinner: true,
            },
          ],
          winnerProfileId: "2",
        },
      ],
    });

    const html = renderFinal(room);
    const graceIndex = html.indexOf("Grace Hopper");
    const adaIndex = html.indexOf("Ada Lovelace");

    expect(graceIndex).toBeGreaterThanOrEqual(0);
    expect(adaIndex).toBeGreaterThanOrEqual(0);
    expect(graceIndex).toBeLessThan(adaIndex);
    expect(html).toContain("1.50 сек");
    expect(html).toContain("1.80 сек");
  });

  it("рендерит финальные итоги на английском языке интерфейса", () => {
    languageStore.reset({ language: "EN" });

    const html = renderFinal(createRoom());

    expect(html).toContain("Winner:");
    expect(html).toContain("Player standings");
    expect(html).toContain("Questions and answers");
    expect(html).toContain("Correct answer");
  });

  it("рендерит изменения рейтинга для рейтинговой игры", () => {
    const room = createRoom({
      isRanked: true,
      ratingChanges: [
        {
          profileId: "1",
          score: 2,
          place: 1,
          beforeRating: 1000,
          afterRating: 1015,
          ratingDelta: 15,
          ratingWeight: 1,
          seasonNumber: 1,
          seasonTitle: "Сезон 1: Весна",
        },
      ],
    });
    const html = renderFinal(room);

    expect(html).toContain("Изменения в рейтинге");
    expect(html).toContain("1000 -> 1015");
    expect(html).toContain("+15 рейтинга");
  });

  it("показывает красные крестики в архивной таблице, если игрок не ответил", () => {
    const baseQuestion = createRoom().questions[0];
    if (!baseQuestion) throw new Error("Missing test question");

    const room = createRoom({
      questions: [
        {
          ...baseQuestion,
          answers: [
            {
              profileId: "1",
              answer: 2,
              distance: 0,
              answeredAt: "",
              responseTimeMs: 900,
              isWinner: true,
            },
          ],
        },
      ],
    });
    const html = renderFinal(room);

    expect(html).toContain('class="games-results-table__missing"');
    expect(html).not.toContain("нет ответа");
    expect(html).not.toContain("без ответа");
    expect(html).not.toContain("нет времени");
  });
});
