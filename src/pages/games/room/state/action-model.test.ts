import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import {
  buildCreateRoomCommand,
  buildJoinByCodePayload,
  buildJoinListedRoomPayload,
  getOptimisticRankedRoom,
  getOptimisticReadyRoom,
  parseGameAnswer,
} from "./action-model";

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

describe("games room action model", () => {
  it("собирает payload создания обычной комнаты", () => {
    const command = buildCreateRoomCommand({
      title: "Room",
      maxPlayers: "4",
      questionCount: "7",
      answerTimeoutSec: "15",
      password: "secret",
      isRanked: false,
    });

    expect(command.payload).toMatchObject({
      title: "Room",
      maxPlayers: 4,
      questionCount: 7,
      answerTimeoutSec: 15,
      password: "secret",
      gameType: "number_duel",
      isRanked: false,
      inviteCodeEnabled: true,
    });
  });

  it("применяет фиксированные ranked-настройки при создании комнаты", () => {
    const command = buildCreateRoomCommand({
      title: "Ranked",
      maxPlayers: "8",
      questionCount: "3",
      answerTimeoutSec: "60",
      password: "",
      isRanked: true,
    });

    expect(command.payload.questionCount).toBe(10);
    expect(command.payload.answerTimeoutSec).toBe(10);
    expect(command.payload).not.toHaveProperty("password");
  });

  it("нормализует payload входа по invite-коду", () => {
    expect(buildJoinByCodePayload("abc123", "pwd")).toEqual({
      inviteCode: "ABC123",
      password: "pwd",
    });
    expect(buildJoinByCodePayload("", "")).toBeNull();
  });

  it("собирает payload входа из списка комнат", () => {
    expect(
      buildJoinListedRoomPayload({
        roomId: "room-1",
        inviteCode: "abc123",
        password: "pwd",
      }),
    ).toEqual({
      roomId: "room-1",
      inviteCode: "ABC123",
      password: "pwd",
    });
  });

  it("парсит числовой ответ с запятой", () => {
    expect(parseGameAnswer("10,5")).toBe(10.5);
    expect(parseGameAnswer("not-number")).toBeNull();
  });

  it("оптимистично меняет готовность текущего игрока", () => {
    const room = createRoom({ players: [createPlayer({ isReady: false })] });

    expect(getOptimisticReadyRoom(room, "1", true).players[0]?.isReady).toBe(true);
  });

  it("сбрасывает готовность при оптимистичной смене ranked-режима", () => {
    const room = createRoom({ players: [createPlayer({ isReady: true })] });
    const nextRoom = getOptimisticRankedRoom(room, true);

    expect(nextRoom.isRanked).toBe(true);
    expect(nextRoom.players[0]?.isReady).toBe(false);
  });
});
