/**
 * Config-фабрика action handlers страницы игр.
 *
 * Преобразует крупные composition-агрегаты страницы в точные зависимости
 * `createGamesPageActionHandlers`.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageRoomServices } from "../room/page-room-services";
import type { GamesPageState } from "../state/store";
import type { GamesPagePendingState } from "../runtime/page-pending-state";
import type { GamesPageStateAdapters } from "../runtime/page-state-adapters";
import type { GamesPageDomAdapters } from "../runtime/page-dom-adapters";
import type { GamesRoomChatRuntime } from "../runtime/room-chat";
import type { GamesRoomSocketRuntime } from "../runtime/room-socket";
import {
  createGamesPageActionHandlers,
  type GamesPageActionHandlers,
} from "./page-action-handlers";

export type GamesPageActionHandlersConfigOptions = {
  getState: () => Readonly<GamesPageState>;
  roomServices: GamesPageRoomServices;
  pendingState: GamesPagePendingState;
  stateAdapters: GamesPageStateAdapters;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  resetGamesState: () => void;
  roomSocketRuntime: Pick<GamesRoomSocketRuntime, "close" | "isOpen" | "sendAnswer">;
  roomChatRuntime: Pick<GamesRoomChatRuntime, "stop">;
  domAdapters: Pick<GamesPageDomAdapters, "syncCurrentAnswerFormDom" | "syncPlayersRailAnswerDom">;
  acceptCurrentAnswerLocally: (answer: number, room?: GameRoom | null) => void;
  syncQuestionReportButtons: (questionKey: string) => void;
};

/**
 * Создаёт action handlers страницы из агрегированных зависимостей.
 */
export function createGamesPageActionHandlersConfig(
  options: GamesPageActionHandlersConfigOptions,
): GamesPageActionHandlers {
  const { roomServices, pendingState, stateAdapters } = options;

  return createGamesPageActionHandlers({
    getState: options.getState,
    getCurrentProfileId: roomServices.getCurrentProfileId,
    getCurrentPlayer: roomServices.getCurrentPlayer,
    isCurrentRoomCreator: roomServices.isCurrentRoomCreator,
    isRoomCreatedByCurrentUser: roomServices.isRoomCreatedByCurrentUser,
    shouldBlockFullRoomJoin: roomServices.shouldBlockFullRoomJoin,
    getRoomTitleValue: roomServices.getRoomTitleValue,
    getPlayerAvatarUrl: roomServices.getPlayerAvatarUrl,
    hydrateGamePlayersAvatars: roomServices.hydrateGamePlayersAvatars,
    hydrateGameRoomAvatars: roomServices.hydrateGameRoomAvatars,
    hydrateGameRoomsAvatars: roomServices.hydrateGameRoomsAvatars,
    hydrateRoomChatAuthorAvatars: roomServices.hydrateRoomChatAuthorAvatars,
    getRoomSystemMessages: roomServices.getRoomSystemMessages,
    mergeRoomChatMessages: roomServices.mergeRoomChatMessages,
    rememberRoomAccess: roomServices.rememberRoomAccess,
    setPendingRankedToast: pendingState.setPendingRankedToast,
    rememberRoomTitle: roomServices.rememberRoomTitle,
    forgetRoomAccess: roomServices.forgetRoomAccess,
    clearRoomAccessRecovery: roomServices.clearRoomAccessRecovery,
    canRecoverRoomAccess: roomServices.canRecoverRoomAccess,
    recoverRoomAccess: roomServices.recoverRoomAccess,
    getPendingVoluntaryLeave: pendingState.getPendingVoluntaryLeave,
    setPendingVoluntaryLeave: pendingState.setPendingVoluntaryLeave,
    clearPendingVoluntaryLeave: roomServices.clearPendingVoluntaryLeave,
    getPendingRankedToast: pendingState.getPendingRankedToast,
    getRankedTypeToastMessage: roomServices.getRankedTypeToastMessage,
    showRoomFullMessage: roomServices.showRoomFullMessage,
    rememberRoomDisconnectRemovalMessage: roomServices.rememberRoomDisconnectRemovalMessage,
    roomSocketRuntime: options.roomSocketRuntime,
    roomChatRuntime: options.roomChatRuntime,
    refreshGamesDom: stateAdapters.refreshGamesDom,
    refreshRoomChatDom: stateAdapters.refreshRoomChatDom,
    setGamesState: stateAdapters.setGamesState,
    patchGamesState: options.patchGamesState,
    resetGamesState: options.resetGamesState,
    setGamesOverlayState: stateAdapters.setGamesOverlayState,
    setRoomChatState: stateAdapters.setRoomChatState,
    syncCurrentAnswerFormDom: options.domAdapters.syncCurrentAnswerFormDom,
    syncPlayersRailAnswerDom: options.domAdapters.syncPlayersRailAnswerDom,
    acceptCurrentAnswerLocally: options.acceptCurrentAnswerLocally,
    reportingQuestionKeys: pendingState.reportingQuestionKeys,
    reportedQuestionKeys: pendingState.reportedQuestionKeys,
    syncQuestionReportButtons: options.syncQuestionReportButtons,
    enrichOwnRoomChatMessage: roomServices.enrichOwnRoomChatMessage,
    getRoomChatAuthorAvatar: roomServices.getRoomChatAuthorAvatar,
  });
}
