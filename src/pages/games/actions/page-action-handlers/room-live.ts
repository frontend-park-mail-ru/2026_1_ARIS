import { getGameRoom } from "../../../../api/games";
import { prepareAvatarLinks } from "../../../../utils/avatar";
import { showAppToast } from "../../../../utils/toast";
import { createRoomLiveActions } from "../room-live-actions";
import type { createRoomUnavailableActions } from "../room-unavailable-actions";
import type { GamesPageActionHandlersOptions } from "./types";

type PageRoomUnavailableActions = ReturnType<typeof createRoomUnavailableActions>;

/**
 * Создаёт live-handlers сокета и фонового обновления комнаты.
 */
export function createPageRoomLiveActions(
  options: GamesPageActionHandlersOptions,
  roomUnavailableActions: PageRoomUnavailableActions,
) {
  const getRoom = () => options.getState().room;
  const getCurrentMessages = () => options.getState().roomChatMessages;

  return createRoomLiveActions({
    getRoom,
    getLoading: () => options.getState().loading,
    getSocketOpenState: () => options.getState().socketOpen,
    getSocketOpenRuntime: () => options.roomSocketRuntime.isOpen(),
    getCurrentProfileId: options.getCurrentProfileId,
    getSubmittedQuestionId: () => options.getState().submittedQuestionId,
    getSubmittedAnswerValue: () => options.getState().submittedAnswerValue,
    getCurrentMessages,
    fetchRoom: getGameRoom,
    hydrateRoom: options.hydrateGameRoomAvatars,
    getSystemMessages: options.getRoomSystemMessages,
    mergeMessages: options.mergeRoomChatMessages,
    rememberRoomAccess: options.rememberRoomAccess,
    clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
    clearRoomAccessRecovery: options.clearRoomAccessRecovery,
    canRecoverRoomAccess: options.canRecoverRoomAccess,
    recoverRoomAccess: options.recoverRoomAccess,
    patchGamesState: options.patchGamesState,
    refreshGamesDom: options.refreshGamesDom,
    syncCurrentAnswerFormDom: options.syncCurrentAnswerFormDom,
    syncPlayersRailAnswerDom: options.syncPlayersRailAnswerDom,
    getPendingRankedToast: options.getPendingRankedToast,
    setPendingRankedToast: options.setPendingRankedToast,
    showToast: showAppToast,
    getRankedToastMessage: options.getRankedTypeToastMessage,
    rememberDisconnectRemoval: options.rememberRoomDisconnectRemovalMessage,
    getAuthorAvatar: options.getRoomChatAuthorAvatar,
    hydrateAuthorAvatars: options.hydrateRoomChatAuthorAvatars,
    prepareAvatarLinks,
    refreshChat: options.refreshRoomChatDom,
    setChatState: options.setRoomChatState,
    setGamesState: options.setGamesState,
    handleRoomUnavailable: roomUnavailableActions.handleRoomUnavailable,
  });
}
