import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createRoomAccessRecoveryActions } from "./room-access-recovery-actions";
import { recoverStoredRoomAccess } from "../room/access-recovery";

vi.mock("../room/access-recovery", () => ({
  recoverStoredRoomAccess: vi.fn(async () => null),
}));

/** Создаёт зависимости actions восстановления доступа к комнате. */
function createOptions() {
  return {
    getStoredRoomAccess: vi.fn(() => null),
    joinRoom: vi.fn(async () => ({ id: "room-1" }) as GameRoom),
    canRecoverRoomAccess: vi.fn(() => true),
    hydrateRoomAvatars: vi.fn(async (room: GameRoom) => room),
    rememberRoomAccess: vi.fn(),
  };
}

describe("room access recovery actions", () => {
  it("делегирует восстановление доступа в room access service", async () => {
    const options = createOptions();
    const actions = createRoomAccessRecoveryActions(options);
    const controller = new AbortController();

    await actions.recoverRoomAccess("room-1", controller.signal);

    expect(recoverStoredRoomAccess).toHaveBeenCalledWith(
      "room-1",
      controller.signal,
      expect.objectContaining({
        getStoredRoomAccess: options.getStoredRoomAccess,
        joinRoom: options.joinRoom,
        canRecoverRoomAccess: options.canRecoverRoomAccess,
        hydrateRoomAvatars: options.hydrateRoomAvatars,
        rememberRoomAccess: options.rememberRoomAccess,
      }),
    );
  });
});
