import { describe, expect, it } from "vitest";
import type { GameRoom, GameRoomStatus } from "../../../api/games";
import {
  canCurrentPlayerForceResume,
  canCurrentPlayerPause,
  getCurrentPlayer,
  getRoomAuthor,
  getRoomMaxPlayers,
  isCurrentRoomCreator,
  isRoomInStartCountdown,
  shouldBlockFullRoomJoin,
} from "./selectors";

function createPlayer(
  profileId: string,
  overrides: Partial<GameRoom["players"][number]> = {},
): GameRoom["players"][number] {
  return {
    profileId,
    userAccountId: `user-${profileId}`,
    name: `Игрок ${profileId}`,
    firstName: "Игрок",
    lastName: profileId,
    gender: "",
    username: `player${profileId}`,
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

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const players = overrides.players ?? [createPlayer("1", { isMe: true }), createPlayer("2")];
  return {
    id: "room-1",
    title: "Комната",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting" as GameRoomStatus,
    createdByProfileId: "1",
    maxPlayers: 2,
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
    creator: null,
    players,
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("games room selectors", () => {
  it("находит текущего игрока по isMe или profileId", () => {
    const room = createRoom({
      players: [createPlayer("1"), createPlayer("2", { isMe: true })],
    });

    expect(getCurrentPlayer(room, "1")?.profileId).toBe("1");
    expect(getCurrentPlayer(room, "")?.profileId).toBe("2");
    expect(getCurrentPlayer(createRoom(), "1")?.profileId).toBe("1");
  });

  it("нормализует лимит игроков и блокирует вход в полную чужую комнату", () => {
    const room = createRoom({ maxPlayers: 99 });
    expect(getRoomMaxPlayers(room)).toBe(8);

    const publicLobby = createRoom({ isPublicLobby: true, maxPlayers: 99 });
    expect(getRoomMaxPlayers(publicLobby)).toBe(80);

    const fullRoom = createRoom({
      maxPlayers: 2,
      players: [createPlayer("1"), createPlayer("2")],
    });

    expect(shouldBlockFullRoomJoin(fullRoom, "3")).toBe(true);
    expect(shouldBlockFullRoomJoin(fullRoom, "1")).toBe(false);
  });

  it("определяет администратора и fallback автора комнаты", () => {
    const creator = createPlayer("7", { name: "Создатель" });
    const room = createRoom({
      createdByProfileId: "7",
      creator,
      players: [createPlayer("1"), creator],
    });

    expect(isCurrentRoomCreator(room, "7")).toBe(true);
    expect(getRoomAuthor(room)).toBe(creator);
  });

  it("проверяет права на паузу и голосование за продолжение", () => {
    const activeRoom = createRoom({
      status: "active",
      players: [createPlayer("1", { isMe: true }), createPlayer("2")],
    });

    expect(canCurrentPlayerPause(activeRoom)).toBe(true);

    expect(canCurrentPlayerPause({ ...activeRoom, isPublicLobby: true })).toBe(false);

    const pausedRoom = createRoom({
      status: "active",
      pausedByProfileId: "2",
      pauseUntilAt: "2026-05-25T10:00:00.000Z",
      players: [createPlayer("1", { isMe: true }), createPlayer("2")],
    });

    expect(canCurrentPlayerPause(pausedRoom)).toBe(false);
    expect(canCurrentPlayerForceResume(pausedRoom)).toBe(true);
  });

  it("распознаёт countdown перед первым вопросом", () => {
    expect(
      isRoomInStartCountdown(
        createRoom({
          status: "active",
          nextQuestionAt: "2026-05-25T10:00:00.000Z",
          currentQuestion: null,
          questions: [],
        }),
      ),
    ).toBe(true);
  });
});
