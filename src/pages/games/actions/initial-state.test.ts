/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api/core/client";
import type { GameRoom, PublicGameGuestSession } from "../../../api/games";
import {
  loadInitialGamesState,
  loadInitialPublicGamesState,
  type LoadInitialGamesStateOptions,
  type LoadInitialPublicGamesStateOptions,
} from "./initial-state";

const room = {
  id: "room-1",
  title: "Room",
  inviteCode: "ABC123",
} as GameRoom;

/** Создаёт зависимости загрузки начального состояния комнаты. */
function createOptions(
  overrides: Partial<LoadInitialGamesStateOptions> = {},
): LoadInitialGamesStateOptions {
  return {
    getRoom: vi.fn(async () => room),
    joinRoom: vi.fn(async () => room),
    hydrateRoom: vi.fn(async (item) => item),
    getStoredRoomSnapshot: vi.fn(() => null),
    getStoredRoomAccess: vi.fn(() => null),
    allowRoomAccessRecovery: vi.fn(),
    rememberRoomTitle: vi.fn(),
    rememberRoomAccess: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    replaceWithGamesMenuRoute: vi.fn(),
    ...overrides,
  };
}

function createPublicOptions(
  overrides: Partial<LoadInitialPublicGamesStateOptions> = {},
): LoadInitialPublicGamesStateOptions {
  return {
    hasSessionUser: vi.fn(() => false),
    joinRoom: vi.fn(async () => room),
    getStoredPublicGuestSession: vi.fn(() => null),
    forgetPublicGuestSession: vi.fn(),
    getPublicRoom: vi.fn(async () => room),
    hydrateRoom: vi.fn(async (item) => item),
    rememberRoomAccess: vi.fn(),
    ...overrides,
  };
}

describe("games initial state action", () => {
  it("возвращает пустое состояние без roomId", async () => {
    const options = createOptions();

    const state = await loadInitialGamesState("", undefined, options);

    expect(state.roomId).toBe("");
    expect(state.room).toBeNull();
    expect(options.getRoom).not.toHaveBeenCalled();
  });

  it("загружает комнату по roomId и запоминает доступ", async () => {
    const options = createOptions();

    const state = await loadInitialGamesState("room-1", undefined, options);

    expect(state.room).toBe(room);
    expect(options.getRoom).toHaveBeenCalledWith("room-1", undefined);
    expect(options.rememberRoomAccess).toHaveBeenCalledWith(room);
  });

  it("восстанавливает комнату из сохранённого snapshot", async () => {
    const options = createOptions({
      getStoredRoomSnapshot: vi.fn(() => room),
      getStoredRoomAccess: vi.fn(() => ({
        roomId: "room-1",
        inviteCode: "ABC123",
        password: "secret",
      })),
    });

    const state = await loadInitialGamesState("room-1", undefined, options);

    expect(state.room).toBe(room);
    expect(options.allowRoomAccessRecovery).toHaveBeenCalledWith("room-1");
    expect(options.rememberRoomTitle).toHaveBeenCalledWith("room-1", "Room");
    expect(options.joinRoom).toHaveBeenCalledWith({
      inviteCode: "ABC123",
      password: "secret",
    });
  });

  it("использует recovery после 403, если восстановление разрешено", async () => {
    const recoveredRoom = { ...room, title: "Recovered" } as GameRoom;
    const options = createOptions({
      getRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
      canRecoverRoomAccess: vi.fn(() => true),
      recoverRoomAccess: vi.fn(async () => recoveredRoom),
    });

    const state = await loadInitialGamesState("room-1", undefined, options);

    expect(state.room).toBe(recoveredRoom);
    expect(options.recoverRoomAccess).toHaveBeenCalledWith("room-1", undefined);
  });

  it("открывает password-модалку после 403 fallback-входа с ошибкой пароля", async () => {
    const options = createOptions({
      getRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
      joinRoom: vi.fn(async () => {
        throw new ApiError("password required", 403, {});
      }),
    });

    const state = await loadInitialGamesState("room-1", undefined, options);

    expect(state.joinPasswordRoomId).toBe("room-1");
    expect(state.error).toBe("");
  });

  it("возвращает в меню при заполненной комнате", async () => {
    const replaceWithGamesMenuRoute = vi.fn();
    const options = createOptions({
      getRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
      joinRoom: vi.fn(async () => {
        throw new ApiError("room is full", 409, {});
      }),
      replaceWithGamesMenuRoute,
    });

    const state = await loadInitialGamesState("room-1", undefined, options);

    expect(state.roomId).toBe("");
    expect(state.message).toBe("В этой комнате уже максимальное число участников.");
    expect(replaceWithGamesMenuRoute).toHaveBeenCalledTimes(1);
  });

  it("авторизованного игрока заводит в публичную комнату обычным профилем", async () => {
    const session: PublicGameGuestSession = {
      inviteCode: "ABC123",
      roomId: "room-1",
      token: "guest-token",
    };
    const options = createPublicOptions({
      hasSessionUser: vi.fn(() => true),
      getStoredPublicGuestSession: vi.fn(() => session),
    });

    const state = await loadInitialPublicGamesState("ABC123", undefined, options);

    expect(state.room).toBe(room);
    expect(state.roomId).toBe("room-1");
    expect(options.joinRoom).toHaveBeenCalledWith({ inviteCode: "ABC123" });
    expect(options.getPublicRoom).not.toHaveBeenCalled();
    expect(options.rememberRoomAccess).toHaveBeenCalledWith(room);
    expect(options.forgetPublicGuestSession).toHaveBeenCalledWith(session);
  });

  it("гостя с сохранённой публичной сессией заводит по guest-token", async () => {
    const session: PublicGameGuestSession = {
      inviteCode: "ABC123",
      roomId: "room-1",
      token: "guest-token",
    };
    const options = createPublicOptions({
      getStoredPublicGuestSession: vi.fn(() => session),
    });

    const state = await loadInitialPublicGamesState("ABC123", undefined, options);

    expect(state.room).toBe(room);
    expect(state.roomId).toBe("room-1");
    expect(options.joinRoom).not.toHaveBeenCalled();
    expect(options.getPublicRoom).toHaveBeenCalledWith("room-1", "guest-token", undefined);
  });
});
