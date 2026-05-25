import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import { getRoomLiveSignature } from "./live-signature";

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
    inviteCode: "",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
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

describe("games room live signature", () => {
  it("возвращает пустую сигнатуру для отсутствующей комнаты", () => {
    expect(getRoomLiveSignature(null)).toBe("");
  });

  it("меняется при изменении live-полей комнаты", () => {
    const baseRoom = createRoom();
    const changedRoom = createRoom({
      players: [createPlayer({ score: 10 })],
    });

    expect(getRoomLiveSignature(baseRoom)).not.toBe(getRoomLiveSignature(changedRoom));
  });

  it("не меняется от полей вне live-сравнения", () => {
    const baseRoom = createRoom({ inviteCode: "ABC123" });
    const changedRoom = createRoom({ inviteCode: "XYZ999" });

    expect(getRoomLiveSignature(baseRoom)).toBe(getRoomLiveSignature(changedRoom));
  });
});
