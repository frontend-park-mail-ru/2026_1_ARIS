import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createRoomLifecycleActions } from "./room-lifecycle-actions";
import { disbandCurrentRoom, exitRoomToMenu } from "./room-lifecycle";
import { backToRooms, returnToRoom } from "./room-navigation";

vi.mock("./room-lifecycle", () => ({
  disbandCurrentRoom: vi.fn(),
  exitRoomToMenu: vi.fn(),
}));

vi.mock("./room-navigation", () => ({
  backToRooms: vi.fn(),
  returnToRoom: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    status: "waiting",
    ...patch,
  } as GameRoom;
}

function createOptions(room = createRoom()) {
  return {
    getRoom: vi.fn(() => room),
    getCurrentProfileId: vi.fn(() => "profile-1"),
    getReturnInviteCode: vi.fn(() => " ABC123 "),
    getReturnPassword: vi.fn(() => " secret "),
    isCurrentRoomCreator: vi.fn(() => true),
    setPendingVoluntaryLeave: vi.fn(),
    clearPendingVoluntaryLeave: vi.fn(),
    forgetRoomAccess: vi.fn(),
    closeRoomSocket: vi.fn(),
    stopRoomChat: vi.fn(),
    resetGamesState: vi.fn(),
    navigateToGamesMenu: vi.fn(),
    navigateToRoom: vi.fn(),
    navigateToRoomsRoute: vi.fn(),
    patchGamesState: vi.fn(),
    refreshGamesDom: vi.fn(),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
  };
}

describe("room lifecycle actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(backToRooms).mockResolvedValue(undefined);
    vi.mocked(disbandCurrentRoom).mockResolvedValue(undefined);
    vi.mocked(exitRoomToMenu).mockResolvedValue(undefined);
    vi.mocked(returnToRoom).mockResolvedValue(undefined);
  });

  it("собирает disband и exit options из текущего состояния", async () => {
    const options = createOptions();
    const actions = createRoomLifecycleActions(options);

    await actions.handleDisbandRoom();
    await actions.handleExitGameToMenu();

    expect(disbandCurrentRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        currentProfileId: "profile-1",
        closeRoomSocket: options.closeRoomSocket,
        navigateAfterDisband: options.navigateToRoomsRoute,
      }),
    );
    expect(exitRoomToMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        stopRoomChat: options.stopRoomChat,
        resetGamesState: options.resetGamesState,
      }),
    );
  });

  it("собирает back-to-rooms с признаком администратора комнаты", async () => {
    const options = createOptions();
    const actions = createRoomLifecycleActions(options);

    await actions.handleBackToRooms();

    expect(options.isCurrentRoomCreator).toHaveBeenCalledWith(options.getRoom());
    expect(backToRooms).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        isCurrentRoomCreator: true,
        loadWaitingRooms: options.loadWaitingRooms,
      }),
    );
  });

  it("обрезает invite/password при возврате в комнату", async () => {
    const options = createOptions();
    const actions = createRoomLifecycleActions(options);

    await actions.handleReturnToRoom("room-1");

    expect(returnToRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-1",
        inviteCode: "ABC123",
        password: "secret",
        navigateToRoom: options.navigateToRoom,
      }),
    );
  });
});
