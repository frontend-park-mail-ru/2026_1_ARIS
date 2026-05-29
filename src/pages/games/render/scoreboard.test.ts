/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { renderGamePlayersRail, renderGameScoreboard } from "./scoreboard";

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
    score: 7,
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(
  players: GamePlayer[] = [createPlayer()],
  overrides: Partial<GameRoom> = {},
): GameRoom {
  return {
    id: "room-1",
    title: "",
    inviteCode: "",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: players[0]?.profileId ?? "",
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 10,
    currentQuestionIndex: 1,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: players[0] ?? null,
    players,
    currentQuestion: {
      id: "q1",
      position: 1,
      text: "Question",
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

const renderProfileLink = (options: { profileId: string; content: string }) =>
  `<a href="/id${options.profileId}">${options.content}</a>`;

describe("games scoreboard render", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("рендерит игроков и очки активной игры", () => {
    const html = renderGameScoreboard({
      room: createRoom([
        createPlayer({ profileId: "1", firstName: "Ada", score: 7, isMe: true }),
        createPlayer({ profileId: "2", firstName: "Grace", score: 3, isMe: false }),
      ]),
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("games-game-scoreboard");
    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
    expect(html).toContain('data-games-scoreboard-card="1"');
  });

  it("рендерит rail с кнопкой выхода и loading-состоянием", () => {
    const html = renderGamePlayersRail({
      room: createRoom(),
      loading: true,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("games-room-players-panel");
    expect(html).toContain("data-games-leave-open");
    expect(html).toContain("disabled");
  });

  it("рендерит кнопку выхода в публичной игре", () => {
    const html = renderGamePlayersRail({
      room: createRoom(undefined, { isPublicLobby: true }),
      loading: false,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("games-room-players-panel--public");
    expect(html).toContain("data-games-leave-open");
    expect(html).toContain("Выйти из игры");
  });

  it("скрывает список игроков после появления последнего вопроса до финальных итогов", () => {
    const html = renderGamePlayersRail({
      room: createRoom(
        [
          createPlayer({ profileId: "1", firstName: "Ada", score: 7, isMe: true }),
          createPlayer({ profileId: "2", firstName: "Grace", score: 3, isMe: false }),
        ],
        {
          currentQuestionIndex: 5,
          currentQuestion: {
            id: "q5",
            position: 5,
            text: "Final question",
            startedAt: "",
            deadlineAt: "",
            hasAnswered: false,
          },
        },
      ),
      loading: false,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("games-room-players-panel");
    expect(html).toContain("Таблица результатов скрыта");
    expect(html).not.toContain("data-games-leave-open");
    expect(html).not.toContain("games-game-scoreboard");
    expect(html).not.toContain("Ada");
    expect(html).not.toContain("Grace");
  });

  it("скрывает список игроков после последнего вопроса, пока финал ещё не пришёл", () => {
    const html = renderGamePlayersRail({
      room: createRoom([createPlayer({ firstName: "Ada" })], {
        currentQuestion: null,
        currentQuestionIndex: 5,
      }),
      loading: false,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("Таблица результатов скрыта");
    expect(html).not.toContain("data-games-leave-open");
    expect(html).not.toContain("games-game-scoreboard");
    expect(html).not.toContain("Ada");
  });

  it("скрывает список игроков на раскрытии результата последнего вопроса", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T10:00:02.000Z"));
    const html = renderGamePlayersRail({
      room: createRoom([createPlayer({ firstName: "Ada" })], {
        status: "finished",
        currentQuestion: null,
        currentQuestionIndex: 5,
        roundPauseSec: 5,
        questions: [
          {
            id: "q5",
            position: 5,
            status: "completed",
            text: "Final question",
            correctAnswer: 10,
            answers: [],
            winnerProfileId: "",
            startedAt: "2026-05-25T09:59:50.000Z",
            deadlineAt: "2026-05-25T10:00:00.000Z",
            completedAt: "2026-05-25T10:00:00.000Z",
          },
        ],
      }),
      loading: false,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("Таблица результатов скрыта");
    expect(html).not.toContain("data-games-leave-open");
    expect(html).not.toContain("games-game-scoreboard");
    expect(html).not.toContain("Ada");
  });

  it("снова показывает список игроков на финальных итогах", () => {
    const html = renderGamePlayersRail({
      room: createRoom([createPlayer({ firstName: "Ada" })], {
        status: "finished",
        currentQuestion: null,
        currentQuestionIndex: 5,
      }),
      loading: false,
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain("games-game-scoreboard");
    expect(html).toContain("Ada");
  });

  it("оставляет анимацию начисления очков, если следующий вопрос уже активен", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T10:00:04.000Z"));
    const players = [
      createPlayer({ profileId: "1", firstName: "Ada", score: 1, isMe: true }),
      createPlayer({ profileId: "2", firstName: "Grace", score: 0, isMe: false }),
    ];
    const html = renderGameScoreboard({
      room: createRoom(players, {
        currentQuestion: {
          id: "q2",
          position: 2,
          text: "Next question",
          startedAt: "2026-05-25T10:00:03.000Z",
          deadlineAt: "2026-05-25T10:00:13.000Z",
          hasAnswered: false,
        },
        questions: [
          {
            id: "q1",
            position: 1,
            status: "completed",
            text: "Previous question",
            correctAnswer: 10,
            answers: [
              {
                profileId: "1",
                answer: 10,
                distance: 0,
                answeredAt: "2026-05-25T10:00:01.000Z",
                responseTimeMs: 1000,
                isWinner: true,
              },
              {
                profileId: "2",
                answer: 8,
                distance: 2,
                answeredAt: "2026-05-25T10:00:01.500Z",
                responseTimeMs: 1500,
                isWinner: false,
              },
            ],
            winnerProfileId: "1",
            startedAt: "2026-05-25T09:59:50.000Z",
            deadlineAt: "2026-05-25T10:00:00.000Z",
            completedAt: "2026-05-25T10:00:00.000Z",
          },
        ],
      }),
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    expect(html).toContain('data-games-score-from="0"');
    expect(html).toContain('data-games-score-to="1"');
    expect(html).toContain("data-games-round-points-badge");
  });

  it("запускает начисление очков за раунд одновременно у всех игроков", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T10:00:04.000Z"));
    const players = [
      createPlayer({ profileId: "1", firstName: "Ada", isMe: true }),
      createPlayer({ profileId: "2", firstName: "Grace", isMe: false }),
      createPlayer({ profileId: "3", firstName: "Linus", isMe: false }),
    ];
    const html = renderGameScoreboard({
      room: createRoom(players, {
        currentQuestion: {
          id: "q2",
          position: 2,
          text: "Next question",
          startedAt: "2026-05-25T10:00:03.000Z",
          deadlineAt: "2026-05-25T10:00:13.000Z",
          hasAnswered: false,
        },
        questions: [
          {
            id: "q1",
            position: 1,
            status: "completed",
            text: "Previous question",
            correctAnswer: 10,
            answers: [
              {
                profileId: "1",
                answer: 10,
                distance: 0,
                answeredAt: "2026-05-25T10:00:01.000Z",
                responseTimeMs: 1000,
                isWinner: true,
              },
              {
                profileId: "2",
                answer: 9,
                distance: 1,
                answeredAt: "2026-05-25T10:00:01.500Z",
                responseTimeMs: 1500,
                isWinner: false,
              },
              {
                profileId: "3",
                answer: 1,
                distance: 9,
                answeredAt: "2026-05-25T10:00:02.000Z",
                responseTimeMs: 2000,
                isWinner: false,
              },
            ],
            winnerProfileId: "1",
            startedAt: "2026-05-25T09:59:50.000Z",
            deadlineAt: "2026-05-25T10:00:00.000Z",
            completedAt: "2026-05-25T10:00:00.000Z",
          },
        ],
      }),
      getPlayerAvatarUrl: () => "",
      renderProfileLink,
    });

    const starts = [...html.matchAll(/data-games-score-start-at="(\d+)"/g)].map(
      (match) => match[1],
    );

    expect(starts).toHaveLength(2);
    expect(new Set(starts).size).toBe(1);
  });
});
