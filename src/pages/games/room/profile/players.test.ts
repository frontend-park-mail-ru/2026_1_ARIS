import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import {
  getGamePlayerLabel,
  getPlayerFullName,
  getPlayerFullNameByProfile,
  getPlayerName,
  getPlayerShortName,
} from "./players";

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
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: false,
    ...overrides,
  };
}

function createRoom(player: GamePlayer): GameRoom {
  return {
    id: "room-1",
    title: "",
    inviteCode: "",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 10,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
  };
}

describe("games room players", () => {
  it("формирует короткое и полное имя из частей профиля", () => {
    const player = createPlayer();

    expect(getPlayerShortName(player)).toBe("Ada");
    expect(getGamePlayerLabel(player)).toBe("Ada");
    expect(getPlayerFullName(player)).toBe("Ada Lovelace");
  });

  it("использует name и username как fallback", () => {
    expect(getPlayerShortName(createPlayer({ firstName: "", name: "Grace Hopper" }))).toBe("Grace");
    expect(getPlayerFullName(createPlayer({ firstName: "", lastName: "", name: "" }))).toBe("ada");
  });

  it("ищет игрока в комнате по profileId", () => {
    const player = createPlayer();
    const room = createRoom(player);

    expect(getPlayerName(room, "1")).toBe("Ada");
    expect(getPlayerFullNameByProfile(room, "1")).toBe("Ada Lovelace");
    expect(getPlayerName(room, "missing")).toBe("Игрок");
  });
});
