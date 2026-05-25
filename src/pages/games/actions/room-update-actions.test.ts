import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { assignRoomAdmin, kickRoomPlayer } from "./room-admin";
import { forceResumeCurrentRoom, pauseCurrentRoom, startCurrentRoom } from "./room-controls";
import { refreshCurrentRoomAction } from "./room-live";
import { toggleRoomRanked, toggleRoomReady, toggleRoomReplay } from "./room-readiness";
import { createRoomUpdateActions } from "./room-update-actions";

vi.mock("./room-admin", () => ({
  assignRoomAdmin: vi.fn(),
  kickRoomPlayer: vi.fn(),
}));

vi.mock("./room-controls", () => ({
  forceResumeCurrentRoom: vi.fn(),
  pauseCurrentRoom: vi.fn(),
  startCurrentRoom: vi.fn(),
}));

vi.mock("./room-live", () => ({
  refreshCurrentRoomAction: vi.fn(),
}));

vi.mock("./room-readiness", () => ({
  toggleRoomRanked: vi.fn(),
  toggleRoomReady: vi.fn(),
  toggleRoomReplay: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    players: [],
    ...patch,
  } as GameRoom;
}

function createOptions(room = createRoom()) {
  return {
    getRoom: vi.fn(() => room),
    getCurrentRoom: vi.fn(() => room),
    getCurrentProfileId: vi.fn(() => "profile-1"),
    getCurrentMessages: vi.fn(() => [] as GameRoomMessage[]),
    fetchRoom: vi.fn(),
    hydrateRoom: vi.fn(async (nextRoom: GameRoom) => nextRoom),
    getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    rememberRoomAccess: vi.fn(),
    setPendingRankedToast: vi.fn(),
    showToast: vi.fn(),
    getRankedToastMessage: vi.fn((isRanked: boolean) => `ranked:${isRanked}`),
    setGamesState: vi.fn(),
  };
}

describe("room update actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignRoomAdmin).mockResolvedValue(undefined);
    vi.mocked(forceResumeCurrentRoom).mockResolvedValue(undefined);
    vi.mocked(kickRoomPlayer).mockResolvedValue(undefined);
    vi.mocked(pauseCurrentRoom).mockResolvedValue(undefined);
    vi.mocked(refreshCurrentRoomAction).mockResolvedValue(undefined);
    vi.mocked(startCurrentRoom).mockResolvedValue(undefined);
    vi.mocked(toggleRoomRanked).mockResolvedValue(undefined);
    vi.mocked(toggleRoomReady).mockResolvedValue(undefined);
    vi.mocked(toggleRoomReplay).mockResolvedValue(undefined);
  });

  it("собирает readiness options для ready/replay/ranked действий", async () => {
    const options = createOptions();
    const actions = createRoomUpdateActions(options);

    await actions.handleReadyToggle(true);
    await actions.handleReplayToggle(false);
    await actions.handleRoomRankedToggle(true);

    expect(toggleRoomReady).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        room: options.getRoom(),
        currentProfileId: "profile-1",
        currentMessages: [],
        setGamesState: options.setGamesState,
      }),
    );
    expect(toggleRoomReplay).toHaveBeenCalledWith(false, expect.any(Object));
    expect(toggleRoomRanked).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        setPendingRankedToast: options.setPendingRankedToast,
        showToast: options.showToast,
      }),
    );
  });

  it("передаёт общий refreshCurrentRoom в admin-действия", async () => {
    const options = createOptions();
    const actions = createRoomUpdateActions(options);

    await actions.handleKickPlayer("profile-2");
    await actions.handleAssignAdmin("profile-2");

    expect(kickRoomPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "profile-2",
        refreshCurrentRoom: expect.any(Function),
      }),
    );
    expect(assignRoomAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "profile-2",
        refreshCurrentRoom: expect.any(Function),
      }),
    );
  });

  it("собирает refresh и control actions из актуального состояния", async () => {
    const options = createOptions();
    const actions = createRoomUpdateActions(options);

    await actions.refreshCurrentRoom();
    await actions.handlePauseRoom();
    await actions.handleForceResumeRoom();
    await actions.handleStartRoom();

    expect(refreshCurrentRoomAction).toHaveBeenCalledWith(
      expect.objectContaining({
        getCurrentRoom: options.getCurrentRoom,
        fetchRoom: options.fetchRoom,
        hydrateRoom: options.hydrateRoom,
      }),
    );
    expect(pauseCurrentRoom).toHaveBeenCalledWith({
      room: options.getRoom(),
      setGamesState: options.setGamesState,
    });
    expect(forceResumeCurrentRoom).toHaveBeenCalledWith({
      room: options.getRoom(),
      setGamesState: options.setGamesState,
    });
    expect(startCurrentRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        currentMessages: [],
        setGamesState: options.setGamesState,
      }),
    );
  });
});
