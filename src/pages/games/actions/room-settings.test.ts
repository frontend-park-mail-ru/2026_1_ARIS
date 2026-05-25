/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api/core/client";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { updateGameRoomPassword, updateGameRoomTitle } from "../../../api/games";
import { renameRoomTitle, updateRoomPassword } from "./room-settings";

vi.mock("../../../api/games", () => ({
  updateGameRoomPassword: vi.fn(),
  updateGameRoomTitle: vi.fn(),
}));

/** Создаёт минимальную комнату для тестов settings actions. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Old title",
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

describe("room settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("переименовывает комнату и запоминает новое название", async () => {
    const room = createRoom();
    const systemMessage = { id: "msg-1", roomId: "room-1", text: "renamed" } as GameRoomMessage;
    vi.mocked(updateGameRoomTitle).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const rememberRoomTitle = vi.fn();

    await renameRoomTitle({
      room,
      title: "New title",
      currentMessages: [],
      getSystemMessages: () => [systemMessage],
      mergeMessages: (_existing, incoming) => incoming,
      rememberRoomTitle,
      onDuplicateTitle: vi.fn(),
      setGamesState,
    });

    expect(updateGameRoomTitle).toHaveBeenCalledWith("room-1", "New title");
    expect(rememberRoomTitle).toHaveBeenCalledWith("room-1", "New title");
    expect(setGamesState).toHaveBeenLastCalledWith({
      room: { ...room, title: "New title" },
      renameTitleModalOpen: false,
      titleMenuOpen: false,
      loading: false,
      message: "Название комнаты изменено",
      messageReturnRoomId: "",
      messageReturnInviteCode: "",
      messageReturnPassword: "",
      messageRefreshRooms: false,
      error: "",
      errorTarget: "",
      roomChatMessages: [systemMessage],
    });
  });

  it("отдает duplicate title ошибку обратно в form layer", async () => {
    const duplicateError = new ApiError("Комната с таким названием уже существует", 409, {});
    vi.mocked(updateGameRoomTitle).mockRejectedValue(duplicateError);
    const setGamesState = vi.fn();
    const onDuplicateTitle = vi.fn();

    await renameRoomTitle({
      room: createRoom(),
      title: "Busy title",
      currentMessages: [],
      getSystemMessages: vi.fn(() => []),
      mergeMessages: vi.fn((existing, incoming) => [...existing, ...incoming]),
      rememberRoomTitle: vi.fn(),
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

  it("обновляет пароль и refresh-ит комнату", async () => {
    vi.mocked(updateGameRoomPassword).mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const refreshCurrentRoom = vi.fn().mockResolvedValue(undefined);
    const showToast = vi.fn();

    await updateRoomPassword({
      room: createRoom(),
      password: "secret",
      successMessage: "Пароль комнаты обновлен",
      refreshCurrentRoom,
      showToast,
      setGamesState,
    });

    expect(updateGameRoomPassword).toHaveBeenCalledWith("room-1", "secret");
    expect(showToast).toHaveBeenCalledWith("Пароль комнаты обновлен");
    expect(refreshCurrentRoom).toHaveBeenCalled();
  });
});
