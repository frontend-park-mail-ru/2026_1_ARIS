/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
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

function createRoom(players: GamePlayer[] = [createPlayer()]): GameRoom {
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
      answerUnit: "",
    },
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
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
});
