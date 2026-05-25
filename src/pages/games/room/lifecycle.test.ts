import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  createPendingVoluntaryLeave,
  getVoluntaryLeaveMessage,
  getVoluntaryLeaveReturnLabel,
} from "./lifecycle";

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

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: true,
    password: "secret",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 3,
    answerTimeoutSec: 30,
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
    ...overrides,
  };
}

describe("games room lifecycle", () => {
  it("формирует тексты добровольного выхода для своей комнаты", () => {
    expect(getVoluntaryLeaveMessage(true)).toBe("Вы вышли из своей комнаты.");
    expect(getVoluntaryLeaveReturnLabel(true)).toBe("Войти в вашу комнату?");
  });

  it("формирует тексты добровольного выхода для чужой комнаты", () => {
    expect(getVoluntaryLeaveMessage(false)).toBe("Вы вышли из комнаты.");
    expect(getVoluntaryLeaveReturnLabel(false)).toBe("Вернуться в комнату?");
  });

  it("создаёт снимок добровольного выхода", () => {
    expect(createPendingVoluntaryLeave(createRoom(), "rooms", false)).toEqual({
      roomId: "room-1",
      nextLobbyMode: "rooms",
      inviteCode: "ABC123",
      password: "secret",
      message: "Вы вышли из комнаты.",
      returnLabel: "Вернуться в комнату?",
    });
  });
});
