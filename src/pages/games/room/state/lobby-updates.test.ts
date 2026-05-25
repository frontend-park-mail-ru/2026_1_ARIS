import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import { normalizeLobbyRoomUpdate, shouldResetReadyOnLobbyRoomUpdate } from "./lobby-updates";

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

describe("games lobby updates", () => {
  it("требует сброс готовности при смене ranked-режима", () => {
    const previousRoom = createRoom({ isRanked: false });
    const nextRoom = createRoom({ isRanked: true });

    expect(shouldResetReadyOnLobbyRoomUpdate(previousRoom, nextRoom)).toBe(true);
    expect(normalizeLobbyRoomUpdate(previousRoom, nextRoom).players[0]?.isReady).toBe(false);
  });

  it("требует сброс готовности при смене состава", () => {
    const previousRoom = createRoom({ players: [createPlayer({ profileId: "1" })] });
    const nextRoom = createRoom({
      players: [createPlayer({ profileId: "1" }), createPlayer({ profileId: "2" })],
    });

    expect(shouldResetReadyOnLobbyRoomUpdate(previousRoom, nextRoom)).toBe(true);
  });

  it("не сбрасывает готовность для активной комнаты", () => {
    const previousRoom = createRoom({ status: "active", isRanked: false });
    const nextRoom = createRoom({ status: "active", isRanked: true });

    expect(shouldResetReadyOnLobbyRoomUpdate(previousRoom, nextRoom)).toBe(false);
    expect(normalizeLobbyRoomUpdate(previousRoom, nextRoom).players[0]?.isReady).toBe(true);
  });
});
