/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  recoverStoredRoomAccess,
  restoreRoomAccess,
  waitForRoomAccessRetry,
  type RoomAccessRecoveryOptions,
} from "./access-recovery";

const room = {
  id: "room-1",
  inviteCode: "ABC123",
} as GameRoom;

/** Создаёт зависимости восстановления доступа к комнате. */
function createOptions(
  overrides: Partial<RoomAccessRecoveryOptions> = {},
): RoomAccessRecoveryOptions {
  return {
    getStoredRoomAccess: () => ({
      roomId: "room-1",
      inviteCode: "ABC123",
      password: "secret",
    }),
    joinRoom: vi.fn(async () => room),
    canRecoverRoomAccess: () => true,
    hydrateRoomAvatars: vi.fn(async (item) => item),
    rememberRoomAccess: vi.fn(),
    retryDelays: [0],
    ...overrides,
  };
}

describe("games room access recovery", () => {
  it("восстанавливает комнату по invite-коду и паролю", async () => {
    const options = createOptions();

    await expect(restoreRoomAccess("room-1", options)).resolves.toBe(room);
    expect(options.joinRoom).toHaveBeenCalledWith({
      inviteCode: "ABC123",
      password: "secret",
    });
  });

  it("восстанавливает комнату по roomId, если invite-код не сохранён", async () => {
    const options = createOptions({
      getStoredRoomAccess: () => ({
        roomId: "room-1",
        inviteCode: "",
        password: "",
      }),
    });

    await expect(restoreRoomAccess("room-1", options)).resolves.toBe(room);
    expect(options.joinRoom).toHaveBeenCalledWith({ roomId: "room-1" });
  });

  it("гидратирует и запоминает восстановленную комнату", async () => {
    const hydratedRoom = { ...room, title: "Hydrated" } as GameRoom;
    const options = createOptions({
      hydrateRoomAvatars: vi.fn(async () => hydratedRoom),
    });

    await expect(recoverStoredRoomAccess("room-1", undefined, options)).resolves.toBe(hydratedRoom);
    expect(options.rememberRoomAccess).toHaveBeenCalledWith(hydratedRoom);
  });

  it("завершает ожидание при abort-сигнале", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = waitForRoomAccessRetry(1000, controller.signal);

    controller.abort();
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
