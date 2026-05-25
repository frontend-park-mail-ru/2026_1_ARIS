import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import { getRoomSystemMessagesPatch, getRoomUpdatePatch } from "./room-update-patches";

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

function createMessage(id: string): GameRoomMessage {
  return {
    id,
    roomId: "room-1",
    authorProfileId: "",
    authorUserAccountId: "",
    authorName: "Сервер",
    authorFirstName: "Сервер",
    authorLastName: "",
    authorUsername: "",
    authorAvatarId: "",
    authorAvatarUrl: "",
    text: "Системное сообщение",
    createdAt: "2026-05-25T00:00:00.000Z",
  };
}

describe("games room update patches", () => {
  it("не добавляет roomChatMessages без системных сообщений", () => {
    expect(
      getRoomSystemMessagesPatch([], [], (existing, incoming) => [...existing, ...incoming]),
    ).toEqual({});
  });

  it("объединяет системные сообщения с текущим чатом", () => {
    const current = [createMessage("old")];
    const incoming = [createMessage("new")];

    expect(
      getRoomSystemMessagesPatch(current, incoming, (existing, messages) => [
        ...existing,
        ...messages,
      ]),
    ).toEqual({
      roomChatMessages: [current[0], incoming[0]],
    });
  });

  it("возвращает patch комнаты с дополнительными полями", () => {
    const room = createRoom();

    expect(
      getRoomUpdatePatch({
        room,
        currentMessages: [],
        systemMessages: [],
        mergeMessages: (existing, incoming) => [...existing, ...incoming],
        patch: { loading: false, error: "" },
      }),
    ).toMatchObject({
      room,
      loading: false,
      error: "",
    });
  });
});
