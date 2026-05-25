/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageActionHandlers } from "./page-action-handlers";
import { createRoomUpdateActions } from "./room-update-actions";

const updateHandlers = {
  refreshCurrentRoom: vi.fn(),
  handleReadyToggle: vi.fn(),
  handleReplayToggle: vi.fn(),
  handleRoomRankedToggle: vi.fn(),
  handlePauseRoom: vi.fn(),
  handleForceResumeRoom: vi.fn(),
  handleStartRoom: vi.fn(),
  handleKickPlayer: vi.fn(),
  handleAssignAdmin: vi.fn(),
};

vi.mock("./room-update-actions", () => ({
  createRoomUpdateActions: vi.fn(() => updateHandlers),
}));

vi.mock("./room-lifecycle-actions", () => ({
  createRoomLifecycleActions: vi.fn(() => ({
    handleDisbandRoom: vi.fn(),
    handleExitGameToMenu: vi.fn(),
    handleBackToRooms: vi.fn(),
    handleReturnToRoom: vi.fn(),
  })),
}));

vi.mock("./room-entry-actions", () => ({
  createRoomEntryActions: vi.fn(() => ({
    handleCreateRoom: vi.fn(),
    handleJoinRoom: vi.fn(),
    handleJoinOwnListedRoom: vi.fn(),
    handleJoinListedRoom: vi.fn(),
  })),
}));

vi.mock("./room-settings-actions", () => ({
  createRoomSettingsActions: vi.fn(() => ({
    handleRenameRoomTitle: vi.fn(),
    handlePasswordForm: vi.fn(),
    handleRemovePassword: vi.fn(),
    handleShowPassword: vi.fn(),
  })),
}));

vi.mock("./room-interaction-actions", () => ({
  createRoomInteractionActions: vi.fn(() => ({
    handleSubmitAnswer: vi.fn(),
    handleReportQuestion: vi.fn(),
    handleSubmitRoomChat: vi.fn(),
    handleCopyInviteCode: vi.fn(),
    handleCopyRoomTitle: vi.fn(),
    handleCopyQuestionAnswer: vi.fn(),
  })),
}));

vi.mock("./lobby-actions", () => ({
  createGamesLobbyActions: vi.fn(() => ({
    loadWaitingRooms: vi.fn(),
    loadLeaderboard: vi.fn(),
    selectLobbyMode: vi.fn(),
  })),
}));

vi.mock("./room-unavailable-actions", () => ({
  createRoomUnavailableActions: vi.fn(() => ({
    handleRoomUnavailable: vi.fn(),
  })),
}));

vi.mock("./profile-navigation-actions", () => ({
  createProfileNavigationActions: vi.fn(() => ({
    openProfileNavigationConfirm: vi.fn(),
    navigateToConfirmedProfile: vi.fn(),
  })),
}));

vi.mock("./room-live-actions", () => ({
  createRoomLiveActions: vi.fn(() => ({
    handleRoomSocketState: vi.fn(),
    handleRoomSocketMessage: vi.fn(),
    refreshCurrentRoomSilently: vi.fn(),
  })),
}));

/** Создаёт зависимости composition action handlers для тестов. */
function createOptions() {
  const state = createInitialGamesState();
  const roomSocketRuntime = {
    close: vi.fn(),
    isOpen: vi.fn(() => false),
    sendAnswer: vi.fn(() => true),
  };
  const roomChatRuntime = {
    stop: vi.fn(),
  };

  return {
    getState: () => state,
    getCurrentProfileId: vi.fn(() => "profile-1"),
    getCurrentPlayer: vi.fn(() => null),
    isCurrentRoomCreator: vi.fn(() => false),
    isRoomCreatedByCurrentUser: vi.fn(() => false),
    shouldBlockFullRoomJoin: vi.fn(() => false),
    getRoomTitleValue: vi.fn(() => "Комната"),
    getPlayerAvatarUrl: vi.fn(() => ""),
    hydrateGamePlayersAvatars: vi.fn(async (players: GameRoom["players"]) => players),
    hydrateGameRoomAvatars: vi.fn(async (room: GameRoom) => room),
    hydrateGameRoomsAvatars: vi.fn(async (rooms: GameRoom[]) => rooms),
    hydrateRoomChatAuthorAvatars: vi.fn(async () => [] as string[]),
    getRoomSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeRoomChatMessages: vi.fn((existing: GameRoomMessage[]) => existing),
    rememberRoomAccess: vi.fn(),
    rememberRoomTitle: vi.fn(),
    forgetRoomAccess: vi.fn(),
    clearRoomAccessRecovery: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    getPendingVoluntaryLeave: vi.fn(() => null),
    setPendingVoluntaryLeave: vi.fn(),
    clearPendingVoluntaryLeave: vi.fn(),
    getPendingRankedToast: vi.fn(() => null),
    setPendingRankedToast: vi.fn(),
    getRankedTypeToastMessage: vi.fn(() => "toast"),
    showRoomFullMessage: vi.fn(),
    rememberRoomDisconnectRemovalMessage: vi.fn(),
    roomSocketRuntime,
    roomChatRuntime,
    refreshGamesDom: vi.fn(),
    refreshRoomChatDom: vi.fn(),
    setGamesState: vi.fn(),
    patchGamesState: vi.fn(),
    resetGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
    setRoomChatState: vi.fn(),
    syncCurrentAnswerFormDom: vi.fn(),
    syncPlayersRailAnswerDom: vi.fn(),
    acceptCurrentAnswerLocally: vi.fn(),
    reportingQuestionKeys: new Set<string>(),
    reportedQuestionKeys: new Set<string>(),
    syncQuestionReportButtons: vi.fn(),
    enrichOwnRoomChatMessage: vi.fn((_, message: GameRoomMessage) => message),
    getRoomChatAuthorAvatar: vi.fn(() => ""),
  };
}

describe("games page action handlers", () => {
  it("собирает фасады действий страницы в единый набор handlers", () => {
    const options = createOptions();

    const handlers = createGamesPageActionHandlers(options);

    expect(handlers.handleReadyToggle).toBe(updateHandlers.handleReadyToggle);
    expect(handlers.loadWaitingRooms).toBeTypeOf("function");
    expect(handlers.handleRoomUnavailable).toBeTypeOf("function");
    expect(handlers.refreshCurrentRoomSilently).toBeTypeOf("function");
    expect(createRoomUpdateActions).toHaveBeenCalledWith(
      expect.objectContaining({
        getCurrentProfileId: options.getCurrentProfileId,
        setGamesState: options.setGamesState,
      }),
    );
  });
});
