import { describe, expect, it, vi } from "vitest";
import { createGamesPageActionHandlersConfig } from "./page-action-handlers-config";
import { createGamesPageActionHandlers } from "./page-action-handlers";

vi.mock("./page-action-handlers", () => ({
  createGamesPageActionHandlers: vi.fn(() => ({ loadWaitingRooms: vi.fn() })),
}));

describe("games page action handlers config", () => {
  it("мапит агрегаты страницы в точные зависимости action handlers", () => {
    const roomServices = {
      getCurrentProfileId: vi.fn(),
      getCurrentPlayer: vi.fn(),
      isCurrentRoomCreator: vi.fn(),
      isRoomCreatedByCurrentUser: vi.fn(),
      shouldBlockFullRoomJoin: vi.fn(),
      getRoomTitleValue: vi.fn(),
      getPlayerAvatarUrl: vi.fn(),
      hydrateGamePlayersAvatars: vi.fn(),
      hydrateGameRoomAvatars: vi.fn(),
      hydrateGameRoomsAvatars: vi.fn(),
      hydrateRoomChatAuthorAvatars: vi.fn(),
      getRoomSystemMessages: vi.fn(),
      mergeRoomChatMessages: vi.fn(),
      rememberRoomAccess: vi.fn(),
      rememberRoomTitle: vi.fn(),
      forgetRoomAccess: vi.fn(),
      clearRoomAccessRecovery: vi.fn(),
      canRecoverRoomAccess: vi.fn(),
      recoverRoomAccess: vi.fn(),
      clearPendingVoluntaryLeave: vi.fn(),
      getRankedTypeToastMessage: vi.fn(),
      showRoomFullMessage: vi.fn(),
      rememberRoomDisconnectRemovalMessage: vi.fn(),
      enrichOwnRoomChatMessage: vi.fn(),
      getRoomChatAuthorAvatar: vi.fn(),
    };
    const pendingState = {
      reportingQuestionKeys: new Set<string>(),
      reportedQuestionKeys: new Set<string>(),
      getPendingRankedToast: vi.fn(),
      setPendingRankedToast: vi.fn(),
      getPendingVoluntaryLeave: vi.fn(),
      setPendingVoluntaryLeave: vi.fn(),
    };
    const stateAdapters = {
      refreshGamesDom: vi.fn(),
      refreshRoomChatDom: vi.fn(),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
      setRoomChatState: vi.fn(),
    };

    createGamesPageActionHandlersConfig({
      getState: vi.fn(),
      roomServices: roomServices as never,
      pendingState: pendingState as never,
      stateAdapters: stateAdapters as never,
      patchGamesState: vi.fn(),
      resetGamesState: vi.fn(),
      roomSocketRuntime: { close: vi.fn(), isOpen: vi.fn(), sendAnswer: vi.fn() },
      roomChatRuntime: { stop: vi.fn() },
      domAdapters: {
        syncCurrentAnswerFormDom: vi.fn(),
        syncPlayersRailAnswerDom: vi.fn(),
      },
      acceptCurrentAnswerLocally: vi.fn(),
      syncQuestionReportButtons: vi.fn(),
    });

    expect(createGamesPageActionHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        getCurrentProfileId: roomServices.getCurrentProfileId,
        setPendingRankedToast: pendingState.setPendingRankedToast,
        refreshGamesDom: stateAdapters.refreshGamesDom,
      }),
    );
  });
});
