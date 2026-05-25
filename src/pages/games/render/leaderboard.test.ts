/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import type { GameLeaderboard, GamePlayer } from "../../../api/games";
import { languageStore } from "../../../state/language";
import { renderLeaderboardPanel } from "./leaderboard";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "7",
    userAccountId: "70",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "",
    username: "ada",
    avatarId: "",
    avatarUrl: "",
    score: 0,
    isReady: false,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: false,
    ...overrides,
  };
}

function createLeaderboard(player: GamePlayer = createPlayer()): GameLeaderboard {
  return {
    gameType: "number_duel",
    season: {
      seasonNumber: 1,
      title: "Season 1: Spring",
      startsAt: "",
      endsAt: "",
    },
    entries: [
      {
        rank: 1,
        profileId: player.profileId,
        player,
        rating: 1200,
        gamesPlayed: 3,
        wins: 2,
        draws: 0,
      },
    ],
  };
}

describe("games leaderboard render", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("рендерит локализованную строку рейтинга", () => {
    languageStore.reset({ language: "EN" });
    const html = renderLeaderboardPanel({
      board: createLeaderboard(),
      loading: false,
      error: "",
      getPlayerFullName: (player) => `${player.firstName} ${player.lastName}`.trim(),
      getPlayerAvatarUrl: () => "",
      getProfileHref: (profileId) => `/id${profileId}`,
    });

    expect(html).toContain("Leaderboard");
    expect(html).toContain("Games: 3, wins: 2");
    expect(html).toContain("/id7");
  });

  it("рендерит ошибку загрузки рейтинга", () => {
    const html = renderLeaderboardPanel({
      board: null,
      loading: false,
      error: "Не удалось загрузить",
      getPlayerFullName: (player) => player.name,
      getPlayerAvatarUrl: () => "",
      getProfileHref: () => "/profile",
    });

    expect(html).toContain("Не удалось загрузить");
    expect(html).toContain("Обновить рейтинг");
  });
});
