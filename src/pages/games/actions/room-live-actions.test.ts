import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { handleRoomSocketMessage as handleRoomSocketMessageBase } from "../runtime/room-socket-message";
import { createRoomLiveActions } from "./room-live-actions";
import { applyRoomSocketState, refreshCurrentRoomSilentlyAction } from "./room-live";

vi.mock("../runtime/room-socket-message", () => ({
  handleRoomSocketMessage: vi.fn(),
}));

vi.mock("./room-live", () => ({
  applyRoomSocketState: vi.fn(),
  refreshCurrentRoomSilentlyAction: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    ...patch,
  } as GameRoom;
}

function createMessage(patch: Partial<GameRoomMessage> = {}): GameRoomMessage {
  return {
    id: "message-1",
    roomId: "room-1",
    text: "hello",
    ...patch,
  } as GameRoomMessage;
}

function createOptions(room = createRoom()) {
  return {
    getRoom: vi.fn(() => room),
    getLoading: vi.fn(() => false),
    getSocketOpenState: vi.fn(() => true),
    getSocketOpenRuntime: vi.fn(() => true),
    getCurrentProfileId: vi.fn(() => "profile-1"),
    getSubmittedQuestionId: vi.fn(() => ""),
    getSubmittedAnswerValue: vi.fn(() => ""),
    getCurrentMessages: vi.fn(() => [] as GameRoomMessage[]),
    fetchRoom: vi.fn(),
    hydrateRoom: vi.fn(async (nextRoom: GameRoom) => nextRoom),
    getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    rememberRoomAccess: vi.fn(),
    clearPendingVoluntaryLeave: vi.fn(),
    clearRoomAccessRecovery: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    patchGamesState: vi.fn(),
    refreshGamesDom: vi.fn(),
    syncCurrentAnswerFormDom: vi.fn(),
    syncPlayersRailAnswerDom: vi.fn(),
    getPendingRankedToast: vi.fn(() => null),
    setPendingRankedToast: vi.fn(),
    showToast: vi.fn(),
    getRankedToastMessage: vi.fn((isRanked: boolean) => `ranked:${isRanked}`),
    rememberDisconnectRemoval: vi.fn(),
    getAuthorAvatar: vi.fn(() => ""),
    hydrateAuthorAvatars: vi.fn(async () => [] as string[]),
    prepareAvatarLinks: vi.fn(),
    refreshChat: vi.fn(),
    setChatState: vi.fn(),
    setGamesState: vi.fn(),
    handleRoomUnavailable: vi.fn().mockResolvedValue(undefined),
  };
}

describe("room live actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyRoomSocketState).mockResolvedValue(undefined);
    vi.mocked(refreshCurrentRoomSilentlyAction).mockResolvedValue(undefined);
  });

  it("собирает socket-state dependencies", async () => {
    const options = createOptions();
    const actions = createRoomLiveActions(options);
    const room = createRoom();

    await actions.handleRoomSocketState(room);

    expect(applyRoomSocketState).toHaveBeenCalledWith(
      room,
      expect.objectContaining({
        getCurrentRoom: options.getRoom,
        getSocketOpen: options.getSocketOpenRuntime,
        patchGamesState: options.patchGamesState,
      }),
    );
  });

  it("собирает socket-message dependencies", () => {
    const options = createOptions();
    const actions = createRoomLiveActions(options);
    const message = createMessage();

    actions.handleRoomSocketMessage(message);

    expect(handleRoomSocketMessageBase).toHaveBeenCalledWith(
      message,
      expect.objectContaining({
        getRoom: options.getRoom,
        getMessages: options.getCurrentMessages,
        rememberDisconnectRemoval: options.rememberDisconnectRemoval,
      }),
    );
  });

  it("собирает silent refresh dependencies", async () => {
    const options = createOptions();
    const actions = createRoomLiveActions(options);

    await actions.refreshCurrentRoomSilently();

    expect(refreshCurrentRoomSilentlyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        getCurrentRoom: options.getRoom,
        getSocketOpen: options.getSocketOpenState,
        handleRoomUnavailable: options.handleRoomUnavailable,
      }),
    );
  });
});
