import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api/core/client";
import type { GameRoom } from "../../../api/games";
import {
  handleRoomUnavailableAction,
  type HandleRoomUnavailableActionDeps,
} from "./room-unavailable";

const room = {
  id: "room-1",
  title: "Room",
} as GameRoom;

/** Создаёт зависимости обработки недоступной комнаты. */
function createDeps(
  overrides: Partial<HandleRoomUnavailableActionDeps> = {},
): HandleRoomUnavailableActionDeps {
  return {
    getRoom: () => room,
    getRoomId: () => "room-1",
    getPendingVoluntaryLeave: () => null,
    clearPendingVoluntaryLeave: vi.fn(),
    clearRoomAccessRecovery: vi.fn(),
    fetchRoom: vi.fn(async () => room),
    hydrateRoom: vi.fn(async (item) => item),
    rememberRoomAccess: vi.fn(),
    canRecoverRoomAccess: () => false,
    recoverRoomAccess: vi.fn(async () => null),
    isSocketOpen: () => true,
    setGamesState: vi.fn(),
    patchGamesState: vi.fn(),
    forgetRoomAccess: vi.fn(),
    closeRoomSocket: vi.fn(),
    navigateToRooms: vi.fn(),
    refreshGamesDom: vi.fn(),
    ...overrides,
  };
}

describe("games room unavailable action", () => {
  it("возвращает комнату, если она снова доступна", async () => {
    const deps = createDeps();

    await handleRoomUnavailableAction(undefined, deps);

    expect(deps.rememberRoomAccess).toHaveBeenCalledWith(room);
    expect(deps.setGamesState).toHaveBeenCalledWith({
      room,
      roomId: "room-1",
      socketOpen: true,
    });
    expect(deps.patchGamesState).not.toHaveBeenCalled();
  });

  it("сохраняет сообщение добровольного выхода при переводе в лобби", async () => {
    const deps = createDeps({
      getPendingVoluntaryLeave: () => ({
        roomId: "room-1",
        nextLobbyMode: "rooms",
        inviteCode: "ABC123",
        password: "secret",
        message: "Вы вышли из комнаты.",
        returnLabel: "Вернуться?",
      }),
      fetchRoom: vi.fn(async () => {
        throw new ApiError("not found", 404, {});
      }),
    });

    await handleRoomUnavailableAction({ recover: false }, deps);

    expect(deps.patchGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        lobbyMode: "rooms",
        message: "Вы вышли из комнаты.",
        messageReturnRoomId: "room-1",
        messageReturnInviteCode: "ABC123",
        messageReturnPassword: "secret",
        messageReturnRoomLabel: "Вернуться?",
      }),
    );
    expect(deps.closeRoomSocket).toHaveBeenCalledTimes(1);
    expect(deps.navigateToRooms).toHaveBeenCalledTimes(1);
  });

  it("показывает удаление из комнаты после 403 без recovery", async () => {
    const deps = createDeps({
      fetchRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
    });

    await handleRoomUnavailableAction({ recover: false }, deps);

    expect(deps.patchGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Вы были удалены из комнаты.",
      }),
    );
    expect(deps.forgetRoomAccess).toHaveBeenCalledWith("room-1");
  });

  it("оставляет страницу в режиме recovery, если окно восстановления ещё открыто", async () => {
    const deps = createDeps({
      fetchRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
      canRecoverRoomAccess: () => true,
      recoverRoomAccess: vi.fn(async () => null),
    });

    await handleRoomUnavailableAction(undefined, deps);

    expect(deps.setGamesState).toHaveBeenCalledWith({ loading: false, error: "" });
    expect(deps.patchGamesState).not.toHaveBeenCalled();
  });
});
