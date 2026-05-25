/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api/core/client";
import type { GameRoom } from "../../../api/games";
import { createGameRoom, joinGameRoom } from "../../../api/games";
import {
  createRoomAction,
  joinListedRoomAction,
  joinOwnListedRoomAction,
  joinRoomByCodeAction,
} from "./room-entry";

vi.mock("../../../api/games", () => ({
  createGameRoom: vi.fn(),
  joinGameRoom: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов entry actions. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: "profile-1",
    maxPlayers: 2,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 30,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 1,
    creator: null,
    players: [],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("room entry actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("создает комнату и открывает её", async () => {
    const room = createRoom();
    vi.mocked(createGameRoom).mockResolvedValue(room);
    const rememberRoomAccess = vi.fn();
    const rememberRoomTitle = vi.fn();
    const navigateToRoom = vi.fn();

    await createRoomAction({
      payload: {
        title: "Room",
        questionCount: 5,
        answerTimeoutSec: 30,
        gameType: "number_duel",
      },
      title: "Room",
      password: "secret",
      hydrateRoom: vi.fn(async (value) => value),
      rememberRoomTitle,
      rememberRoomAccess,
      navigateToRoom,
      onDuplicateTitle: vi.fn(),
      setGamesState: vi.fn(),
    });

    expect(createGameRoom).toHaveBeenCalled();
    expect(rememberRoomTitle).toHaveBeenCalledWith("room-1", "Room");
    expect(rememberRoomAccess).toHaveBeenCalledWith(room, { password: "secret" });
    expect(navigateToRoom).toHaveBeenCalledWith("room-1");
  });

  it("передает duplicate title ошибку обратно в form layer", async () => {
    vi.mocked(createGameRoom).mockRejectedValue(
      new ApiError("Комната с таким названием уже существует", 409, {}),
    );
    const onDuplicateTitle = vi.fn();
    const setGamesState = vi.fn();

    await createRoomAction({
      payload: {
        title: "Room",
        questionCount: 5,
        answerTimeoutSec: 30,
        gameType: "number_duel",
      },
      title: "Room",
      password: "",
      hydrateRoom: vi.fn(async (value) => value),
      rememberRoomTitle: vi.fn(),
      rememberRoomAccess: vi.fn(),
      navigateToRoom: vi.fn(),
      onDuplicateTitle,
      setGamesState,
    });

    expect(onDuplicateTitle).toHaveBeenCalledWith("Комната с таким названием уже существует");
    expect(setGamesState).toHaveBeenLastCalledWith({
      loading: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("подключается к комнате по invite-коду", async () => {
    const room = createRoom();
    vi.mocked(joinGameRoom).mockResolvedValue(room);
    const rememberRoomAccess = vi.fn();
    const navigateToRoom = vi.fn();

    await joinRoomByCodeAction({
      inviteCode: "ABC123",
      password: "secret",
      payload: { inviteCode: "ABC123", password: "secret" },
      rememberRoomAccess,
      navigateToRoom,
      navigateToGamesMenu: vi.fn(),
      showRoomFullMessage: vi.fn(),
      loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
    });

    expect(joinGameRoom).toHaveBeenCalledWith({ inviteCode: "ABC123", password: "secret" });
    expect(rememberRoomAccess).toHaveBeenCalledWith(room, {
      password: "secret",
      inviteCode: "ABC123",
    });
    expect(navigateToRoom).toHaveBeenCalledWith("room-1");
  });

  it("пишет ошибку пароля для входа по invite-коду", async () => {
    vi.mocked(joinGameRoom).mockRejectedValue(new ApiError("invalid password", 403, {}));
    const setGamesState = vi.fn();

    await joinRoomByCodeAction({
      inviteCode: "ABC123",
      password: "bad",
      payload: { inviteCode: "ABC123", password: "bad" },
      rememberRoomAccess: vi.fn(),
      navigateToRoom: vi.fn(),
      navigateToGamesMenu: vi.fn(),
      showRoomFullMessage: vi.fn(),
      loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
      setGamesState,
      setGamesOverlayState: vi.fn(),
    });

    expect(setGamesState).toHaveBeenLastCalledWith({
      loading: false,
      message: "",
      error: "",
      errorTarget: "",
      joinInviteCodeValue: "ABC123",
      joinPasswordValue: "bad",
      joinInviteCodeError: "",
      joinPasswordError: "Пароль неверный",
    });
  });

  it("возвращает создателя в свою комнату из списка", async () => {
    const room = createRoom();
    vi.mocked(joinGameRoom).mockResolvedValue(room);
    const navigateToRoom = vi.fn();

    await joinOwnListedRoomAction({
      room,
      rememberRoomAccess: vi.fn(),
      navigateToRoom,
      loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
      setGamesState: vi.fn(),
    });

    expect(joinGameRoom).toHaveBeenCalledWith({ roomId: "room-1" });
    expect(navigateToRoom).toHaveBeenCalledWith("room-1");
  });

  it("блокирует вход в заполненную комнату из списка", async () => {
    const showRoomFullMessage = vi.fn();

    await joinListedRoomAction({
      roomId: "room-1",
      inviteCode: "",
      password: "",
      payload: { roomId: "room-1" },
      listedRoom: createRoom(),
      shouldBlockFullRoomJoin: () => true,
      rememberRoomAccess: vi.fn(),
      navigateToRoom: vi.fn(),
      navigateToGamesMenu: vi.fn(),
      showRoomFullMessage,
      loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
    });

    expect(showRoomFullMessage).toHaveBeenCalled();
    expect(joinGameRoom).not.toHaveBeenCalled();
  });
});
