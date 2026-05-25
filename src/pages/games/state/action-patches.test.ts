import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  getBackToRoomsPatch,
  getCreateRoomLoadingPatch,
  getDisbandRoomSuccessPatch,
  getExistingCreatedRoomPatch,
  getInlineRoomLoadingPatch,
  getJoinRoomLoadingPatch,
  getPasswordActionSuccessPatch,
  getPasswordVisibilityPatch,
  getReturnRoomLoadingPatch,
  getRoomFullMessagePatch,
  getRoomNotFoundPatch,
  getRoomUnavailablePatch,
} from "./action-patches";

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

describe("games action patches", () => {
  it("возвращает patch начала создания комнаты", () => {
    expect(getCreateRoomLoadingPatch()).toMatchObject({
      loading: true,
      message: "Создаем комнату...",
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает inline loading patch", () => {
    expect(getInlineRoomLoadingPatch("Сохраняем...")).toEqual({
      loading: true,
      message: "Сохраняем...",
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает patch начала входа по invite-коду", () => {
    expect(getJoinRoomLoadingPatch("ABC123", "pwd")).toMatchObject({
      loading: true,
      message: "Подключаемся к комнате...",
      joinInviteCodeValue: "ABC123",
      joinPasswordValue: "pwd",
      joinInviteCodeError: "",
      joinPasswordError: "",
    });
  });

  it("возвращает patch возврата в комнату", () => {
    expect(getReturnRoomLoadingPatch("room-1", "ABC123", "pwd")).toMatchObject({
      loading: true,
      message: "Возвращаемся в игровую комнату...",
      messageReturnRoomId: "room-1",
      messageReturnInviteCode: "ABC123",
      messageReturnPassword: "pwd",
    });
  });

  it("возвращает patch лимита созданных комнат", () => {
    expect(getExistingCreatedRoomPatch(createRoom())).toMatchObject({
      loading: false,
      message: "Вы не можете создать больше одной комнаты.",
      messageReturnRoomId: "room-1",
      messageReturnInviteCode: "ABC123",
      messageReturnPassword: "secret",
      messageReturnRoomLabel: "Войти в вашу комнату?",
    });
  });

  it("возвращает patch отсутствующей комнаты", () => {
    expect(getRoomNotFoundPatch()).toMatchObject({
      loading: false,
      message: "Этой комнаты не существует.",
      messageRefreshRooms: true,
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает patch заполненной комнаты", () => {
    expect(getRoomFullMessagePatch()).toMatchObject({
      loading: false,
      message: "В этой комнате уже максимальное число участников.",
      joinPasswordRoomId: "",
      joinPasswordValue: "",
      joinPasswordVisible: false,
      joinPasswordError: "",
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает patch успешного роспуска комнаты", () => {
    expect(getDisbandRoomSuccessPatch()).toMatchObject({
      room: null,
      roomId: "",
      lobbyMode: "menu",
      loading: false,
      message: "Комната распущена.",
      socketOpen: false,
    });
  });

  it("возвращает patch выхода к списку комнат", () => {
    expect(
      getBackToRoomsPatch({
        roomId: "room-1",
        nextLobbyMode: "rooms",
        inviteCode: "ABC123",
        password: "secret",
        message: "Вы вышли из комнаты.",
        returnLabel: "Вернуться в комнату?",
      }),
    ).toMatchObject({
      room: null,
      roomId: "",
      lobbyMode: "rooms",
      message: "Вы вышли из комнаты.",
      messageReturnRoomId: "room-1",
      messageReturnInviteCode: "ABC123",
      messageReturnPassword: "secret",
      messageReturnRoomLabel: "Вернуться в комнату?",
    });
  });

  it("возвращает patch недоступной комнаты", () => {
    expect(
      getRoomUnavailablePatch({
        lobbyMode: "rooms",
        message: "Вы вышли из комнаты.",
        messageReturnRoomId: "room-1",
        messageReturnInviteCode: "ABC123",
        messageReturnPassword: "secret",
        messageReturnRoomLabel: "Вернуться?",
      }),
    ).toMatchObject({
      room: null,
      roomId: "",
      lobbyMode: "rooms",
      socketOpen: false,
      message: "Вы вышли из комнаты.",
      messageReturnRoomId: "room-1",
      messageReturnInviteCode: "ABC123",
      messageReturnPassword: "secret",
      messageReturnRoomLabel: "Вернуться?",
      error: "",
    });
  });

  it("возвращает patch успешного password-действия", () => {
    expect(getPasswordActionSuccessPatch()).toEqual({
      passwordModalMode: "",
      passwordMenuOpen: false,
      passwordVisible: false,
      errorTarget: "",
    });
  });

  it("возвращает patch переключения видимости пароля", () => {
    expect(getPasswordVisibilityPatch(createRoom(), false)).toMatchObject({
      passwordMenuOpen: false,
      passwordVisible: true,
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает ошибку при попытке показать пустой пароль", () => {
    expect(getPasswordVisibilityPatch(createRoom({ password: "" }), false)).toMatchObject({
      passwordMenuOpen: false,
      error: "Пароль не получен.",
      errorTarget: "password",
    });
  });
});
