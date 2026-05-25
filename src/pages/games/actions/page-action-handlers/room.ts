import { getGameRoom } from "../../../../api/games";
import { prepareAvatarLinks } from "../../../../utils/avatar";
import { showAppToast } from "../../../../utils/toast";
import { closeGamesMenus } from "../../render/floating-menu";
import { findReportableQuestion, getQuestionClipboardText } from "../../room/question-report";
import { copyTextToClipboard } from "../../shared/clipboard";
import { navigateToGamesMenu, navigateToRoom } from "../../shared/navigation";
import type { createGamesLobbyActions } from "../lobby-actions";
import { createRoomEntryActions } from "../room-entry-actions";
import { createRoomInteractionActions } from "../room-interaction-actions";
import { createRoomLifecycleActions } from "../room-lifecycle-actions";
import { createRoomSettingsActions } from "../room-settings-actions";
import { createRoomUnavailableActions } from "../room-unavailable-actions";
import { createRoomUpdateActions } from "../room-update-actions";
import type { GamesPageActionHandlersOptions } from "./types";

type PageLobbyActions = ReturnType<typeof createGamesLobbyActions>;

/**
 * Создаёт handlers жизненного цикла, входа, настроек и действий внутри комнаты.
 */
export function createPageRoomActions(
  options: GamesPageActionHandlersOptions,
  lobbyActions: PageLobbyActions,
) {
  const getRoom = () => options.getState().room;
  const getCurrentMessages = () => options.getState().roomChatMessages;

  const roomUpdateActions = createRoomUpdateActions({
    getRoom,
    getCurrentRoom: getRoom,
    getCurrentProfileId: options.getCurrentProfileId,
    getCurrentMessages,
    fetchRoom: getGameRoom,
    hydrateRoom: options.hydrateGameRoomAvatars,
    getSystemMessages: options.getRoomSystemMessages,
    mergeMessages: options.mergeRoomChatMessages,
    rememberRoomAccess: options.rememberRoomAccess,
    setPendingRankedToast: options.setPendingRankedToast,
    showToast: showAppToast,
    getRankedToastMessage: options.getRankedTypeToastMessage,
    setGamesState: options.setGamesState,
  });

  const roomLifecycleActions = createRoomLifecycleActions({
    getRoom,
    getCurrentProfileId: options.getCurrentProfileId,
    getReturnInviteCode: () => options.getState().messageReturnInviteCode,
    getReturnPassword: () => options.getState().messageReturnPassword,
    isCurrentRoomCreator: options.isCurrentRoomCreator,
    setPendingVoluntaryLeave: options.setPendingVoluntaryLeave,
    clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
    forgetRoomAccess: options.forgetRoomAccess,
    closeRoomSocket: () => options.roomSocketRuntime.close(),
    stopRoomChat: () => options.roomChatRuntime.stop(),
    resetGamesState: options.resetGamesState,
    navigateToGamesMenu,
    navigateToRoom,
    navigateToRoomsRoute: () => window.history.pushState({}, "", "/games/quiz"),
    patchGamesState: options.patchGamesState,
    refreshGamesDom: options.refreshGamesDom,
    loadWaitingRooms: (loadOptions) => lobbyActions.loadWaitingRooms(loadOptions),
    setGamesState: options.setGamesState,
  });

  const roomEntryActions = createRoomEntryActions({
    getRooms: () => options.getState().rooms,
    hydrateRoom: options.hydrateGameRoomAvatars,
    shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
    rememberRoomTitle: options.rememberRoomTitle,
    rememberRoomAccess: options.rememberRoomAccess,
    navigateToRoom,
    navigateToGamesMenu,
    showRoomFullMessage: options.showRoomFullMessage,
    loadWaitingRooms: (loadOptions) => lobbyActions.loadWaitingRooms(loadOptions),
    setGamesState: options.setGamesState,
    setGamesOverlayState: options.setGamesOverlayState,
  });

  const roomSettingsActions = createRoomSettingsActions({
    getRoom,
    getCurrentMessages,
    getPasswordVisible: () => options.getState().passwordVisible,
    getSystemMessages: options.getRoomSystemMessages,
    mergeMessages: options.mergeRoomChatMessages,
    rememberRoomTitle: options.rememberRoomTitle,
    refreshCurrentRoom: roomUpdateActions.refreshCurrentRoom,
    showToast: showAppToast,
    setGamesState: options.setGamesState,
  });

  const roomInteractionActions = createRoomInteractionActions({
    getRoom,
    getRoomChatSending: () => options.getState().roomChatSending,
    getCurrentMessages,
    sendAnswerBySocket: (value) => options.roomSocketRuntime.sendAnswer(value),
    acceptCurrentAnswerLocally: options.acceptCurrentAnswerLocally,
    reportingQuestionKeys: options.reportingQuestionKeys,
    reportedQuestionKeys: options.reportedQuestionKeys,
    syncQuestionReportButtons: options.syncQuestionReportButtons,
    enrichOwnMessage: options.enrichOwnRoomChatMessage,
    getAuthorAvatar: options.getRoomChatAuthorAvatar,
    hydrateAuthorAvatars: options.hydrateRoomChatAuthorAvatars,
    prepareAvatarLinks,
    mergeMessages: options.mergeRoomChatMessages,
    refreshChat: options.refreshRoomChatDom,
    setChatState: options.setRoomChatState,
    findQuestion: findReportableQuestion,
    getQuestionClipboardText,
    closeMenus: closeGamesMenus,
    copyText: copyTextToClipboard,
    showToast: showAppToast,
    setGamesState: options.setGamesState,
  });

  const roomUnavailableActions = createRoomUnavailableActions({
    getRoom,
    getRoomId: () => options.getState().roomId,
    getPendingVoluntaryLeave: options.getPendingVoluntaryLeave,
    clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
    clearRoomAccessRecovery: options.clearRoomAccessRecovery,
    fetchRoom: getGameRoom,
    hydrateRoom: options.hydrateGameRoomAvatars,
    rememberRoomAccess: options.rememberRoomAccess,
    canRecoverRoomAccess: options.canRecoverRoomAccess,
    recoverRoomAccess: options.recoverRoomAccess,
    isSocketOpen: () => options.roomSocketRuntime.isOpen(),
    setGamesState: options.setGamesState,
    patchGamesState: options.patchGamesState,
    forgetRoomAccess: options.forgetRoomAccess,
    closeRoomSocket: () => options.roomSocketRuntime.close(),
    navigateToRooms: () => window.history.pushState({}, "", "/games/quiz"),
    refreshGamesDom: options.refreshGamesDom,
  });

  return {
    roomUpdateActions,
    roomLifecycleActions,
    roomEntryActions,
    roomSettingsActions,
    roomInteractionActions,
    roomUnavailableActions,
  };
}
