/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createRoomEntryActions } from "./room-entry-actions";
import { joinOwnListedRoomAction } from "./room-entry";
import {
  createRoomFromFormAction,
  joinListedRoomFromFormAction,
  joinRoomByCodeFromFormAction,
} from "./room-entry-forms";

vi.mock("./room-entry", () => ({
  joinOwnListedRoomAction: vi.fn(),
}));

vi.mock("./room-entry-forms", () => ({
  createRoomFromFormAction: vi.fn(),
  joinListedRoomFromFormAction: vi.fn(),
  joinRoomByCodeFromFormAction: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    ...patch,
  } as GameRoom;
}

function createOptions(rooms = [createRoom()]) {
  return {
    getRooms: vi.fn(() => rooms),
    hydrateRoom: vi.fn(async (room: GameRoom) => room),
    shouldBlockFullRoomJoin: vi.fn(() => false),
    rememberRoomTitle: vi.fn(),
    rememberRoomAccess: vi.fn(),
    navigateToRoom: vi.fn(),
    navigateToGamesMenu: vi.fn(),
    showRoomFullMessage: vi.fn(),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
  };
}

describe("room entry actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createRoomFromFormAction).mockResolvedValue(undefined);
    vi.mocked(joinListedRoomFromFormAction).mockResolvedValue(undefined);
    vi.mocked(joinOwnListedRoomAction).mockResolvedValue(undefined);
    vi.mocked(joinRoomByCodeFromFormAction).mockResolvedValue(undefined);
  });

  it("собирает create-room options", async () => {
    const options = createOptions();
    const actions = createRoomEntryActions(options);
    const form = document.createElement("form");

    await actions.handleCreateRoom(form);

    expect(createRoomFromFormAction).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        hydrateRoom: options.hydrateRoom,
        rememberRoomTitle: options.rememberRoomTitle,
        navigateToRoom: options.navigateToRoom,
      }),
    );
  });

  it("собирает join-by-code и join-own-listed options", async () => {
    const options = createOptions();
    const actions = createRoomEntryActions(options);
    const form = document.createElement("form");
    const room = createRoom({ id: "room-2" });

    await actions.handleJoinRoom(form);
    await actions.handleJoinOwnListedRoom(room);

    expect(joinRoomByCodeFromFormAction).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        navigateToGamesMenu: options.navigateToGamesMenu,
        setGamesOverlayState: options.setGamesOverlayState,
      }),
    );
    expect(joinOwnListedRoomAction).toHaveBeenCalledWith(
      expect.objectContaining({
        room,
        loadWaitingRooms: options.loadWaitingRooms,
      }),
    );
  });

  it("берёт актуальный список комнат для join-listed", async () => {
    const rooms = [createRoom({ id: "room-3" })];
    const options = createOptions(rooms);
    const actions = createRoomEntryActions(options);
    const form = document.createElement("form");

    await actions.handleJoinListedRoom(form);

    expect(joinListedRoomFromFormAction).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        rooms,
        shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
        showRoomFullMessage: options.showRoomFullMessage,
      }),
    );
  });
});
