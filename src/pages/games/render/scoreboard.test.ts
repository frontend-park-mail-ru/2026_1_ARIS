/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
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
    vi.useRealTimers();
  });
});
