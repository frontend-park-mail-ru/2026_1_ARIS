import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createRoomUnavailableActions } from "./room-unavailable-actions";
import { handleRoomUnavailableAction } from "./room-unavailable";

vi.mock("./room-unavailable", () => ({
  handleRoomUnavailableAction: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    ...patch,
  } as GameRoom;
}

function createOptions() {
  const room = createRoom();
  return {
    getRoom: vi.fn(() => room),
    getRoomId: vi.fn(() => room.id),
    getPendingVoluntaryLeave: vi.fn(() => null),
    clearPendingVoluntaryLeave: vi.fn(),
    clearRoomAccessRecovery: vi.fn(),
    fetchRoom: vi.fn(async () => room),
    hydrateRoom: vi.fn(async (nextRoom: GameRoom) => nextRoom),
    rememberRoomAccess: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    isSocketOpen: vi.fn(() => true),
    setGamesState: vi.fn(),
    patchGamesState: vi.fn(),
    forgetRoomAccess: vi.fn(),
    closeRoomSocket: vi.fn(),
    navigateToRooms: vi.fn(),
    refreshGamesDom: vi.fn(),
  };
}

describe("room unavailable actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleRoomUnavailableAction).mockResolvedValue(undefined);
  });

  it("передаёт зависимости в базовый action", async () => {
    const options = createOptions();
    const actions = createRoomUnavailableActions(options);

    await actions.handleRoomUnavailable({ recover: false });

    expect(handleRoomUnavailableAction).toHaveBeenCalledWith(
      { recover: false },
      expect.objectContaining({
        getRoom: options.getRoom,
        fetchRoom: options.fetchRoom,
        refreshGamesDom: options.refreshGamesDom,
      }),
    );
  });

  it("переиспользует текущий promise при параллельном запуске", async () => {
    const options = createOptions();
    let resolveAction: () => void = () => undefined;
    vi.mocked(handleRoomUnavailableAction).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const actions = createRoomUnavailableActions(options);

    const first = actions.handleRoomUnavailable();
    const second = actions.handleRoomUnavailable({ recover: false });
    resolveAction();
    await Promise.all([first, second]);

    expect(handleRoomUnavailableAction).toHaveBeenCalledTimes(1);
  });
});
