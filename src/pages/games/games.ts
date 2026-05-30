/**
 * Страница игрового микросервиса.
 *
 * `/games` показывает каталог игр, а `/games/quiz` открывает числовую викторину.
 */
import { getSessionUser } from "../../state/session";
import { gamesState, patchGamesState, resetGamesState } from "./state/store";
import { createGamesPageRoomServices } from "./room/page-room-services";
import { isGamesCatalogRoute } from "./shared/navigation";
import { createGamesPageRuntimes } from "./runtime/page-runtimes";
import { createGamesPageRuntimesOptions } from "./runtime/page-runtimes-options";
import { bindGamesPageBootstrapEvents, createGamesPageBootstrap } from "./runtime/page-bootstrap";
import {
  connectGamesPageRuntimeRefs,
  createGamesPageRuntimeRefs,
} from "./runtime/page-runtime-refs";
import { createGamesPageRoot } from "./runtime/page-root";
import { createGamesPagePendingState } from "./runtime/page-pending-state";
import { createGamesPageLifecycleConfig } from "./runtime/page-lifecycle-config";
import { createGamesPageDomAdaptersConfig } from "./runtime/page-dom-adapters-config";
import { createGamesPageStateAdapters } from "./runtime/page-state-adapters";
import { createGamesPageEventsConfig } from "./events/page-events-config";
import { createAnswerLocalAdapter } from "./actions/answer-local-adapter";
import { createGamesPageActionHandlersConfig } from "./actions/page-action-handlers-config";
import { createGamesPageRendering } from "./render/page-rendering";
import { renderGamesPage } from "./actions/page-render";
import { createGamesPageRenderConfig } from "./actions/page-render-config";

const gamesPageRoot = createGamesPageRoot();
const gamesPagePendingState = createGamesPagePendingState();
const {
  reportingQuestionKeys,
  reportedQuestionKeys,
  getPendingVoluntaryLeave,
  setPendingVoluntaryLeave,
} = gamesPagePendingState;
const gamesPageRuntimeRefs = createGamesPageRuntimeRefs();
const gamesPageStateAdapters = createGamesPageStateAdapters({
  patchGamesState,
});
const {
  refreshGamesDom,
  setGamesState,
  setGamesOverlayState,
  setQuestionReportOverlayState,
  setRoomSocketOpenState,
  setRoomChatState,
  connectDomAdapters,
} = gamesPageStateAdapters;
const gamesRoomServices = createGamesPageRoomServices({
  getPasswordVisible: () => gamesState.passwordVisible,
  getPendingVoluntaryLeave,
  setPendingVoluntaryLeave,
  setGamesState,
});
const {
  getRoomPasswordDisplayValue,
  showRoomFullMessage,
  getRoomTitleValue,
  rememberRoomTitle,
  mergeRoomChatMessages,
  getCurrentProfileId,
  getCurrentPlayer,
  isCurrentRoomCreator,
  shouldBlockFullRoomJoin,
  isRoomCreatedByCurrentUser,
  getPlayerAvatarUrl,
  getRoomChatAuthorAvatar,
  getRoomChatAuthorFirstName,
  getRoomChatAuthorName,
  getRoomChatPlayer,
  hydrateGameRoomAvatars,
  hydrateRoomChatAuthorAvatars,
  canRecoverRoomAccess,
  clearRoomAccessRecovery,
  recoverRoomAccess,
} = gamesRoomServices;
const gamesPageRenderer = createGamesPageRendering({
  getRoot: gamesPageRoot.getRoot,
  getState: () => gamesState,
  isCatalogRoute: isGamesCatalogRoute,
  isAuthorised: () => Boolean(getSessionUser()),
  reportedQuestionKeys,
  reportingQuestionKeys,
  getCurrentProfileId,
  getCurrentPlayer,
  getPlayerAvatarUrl,
  getRoomTitleValue,
  getRoomPasswordDisplayValue,
  getRoomChatAuthorName,
  getRoomChatAuthorFirstName,
  getRoomChatAuthorAvatar,
  getRoomChatPlayer,
  shouldBlockFullRoomJoin,
  isCurrentRoomCreator,
});
const {
  getLobbyRenderOptions,
  syncQuestionReportButtons,
  renderGamePlayersRail,
  renderRoomChat,
  renderGamesContent,
  renderGamesOverlayContent,
  renderQuestionReportOverlayContent,
  renderGamesPageShellContent: renderGamesPageShell,
} = gamesPageRenderer;
const gamesPageRuntimes = createGamesPageRuntimes(
  createGamesPageRuntimesOptions({
    getRoot: gamesPageRoot.getRoot,
    getState: () => gamesState,
    mergeRoomChatMessages,
    hydrateRoomChatAuthorAvatars,
    canRecoverRoomAccess,
    recoverRoomAccess,
    clearRoomAccessRecovery,
    setRecoveredRoom: (room) => {
      setGamesState({ room, roomId: room.id, error: "" });
    },
    setRoomChatState,
    setRoomSocketOpenState,
    refreshGamesDom,
    runtimeRefs: gamesPageRuntimeRefs,
  }),
);
const {
  countdown: gamesCountdownRuntime,
  roomChat: gamesRoomChatRuntime,
  roomSocket: gamesRoomSocketRuntime,
  roomsAutoRefresh: roomsAutoRefreshRuntime,
  roomStateRefresh: roomStateRefreshRuntime,
} = gamesPageRuntimes;
const gamesPageDomAdapters = createGamesPageDomAdaptersConfig({
  getRoot: gamesPageRoot.getRoot,
  getState: () => gamesState,
  renderContent: renderGamesContent,
  renderPageShell: renderGamesPageShell,
  renderOverlay: renderGamesOverlayContent,
  renderQuestionReportOverlay: renderQuestionReportOverlayContent,
  renderPlayersRail: renderGamePlayersRail,
  renderRoomChat,
  countdownRuntime: gamesCountdownRuntime,
  roomChatRuntime: gamesRoomChatRuntime,
  roomSocketRuntime: gamesRoomSocketRuntime,
  roomsAutoRefreshRuntime,
  roomStateRefreshRuntime,
});
connectDomAdapters(gamesPageDomAdapters);
const { syncCurrentAnswerFormDom, syncPlayersRailAnswerDom } = gamesPageDomAdapters;
const { acceptCurrentAnswerLocally } = createAnswerLocalAdapter({
  getCurrentRoom: () => gamesState.room,
  setGamesState,
  patchGamesState,
  syncCurrentAnswerFormDom,
  syncPlayersRailAnswerDom,
});
const gamesPageActionHandlers = createGamesPageActionHandlersConfig({
  getState: () => gamesState,
  roomServices: gamesRoomServices,
  pendingState: gamesPagePendingState,
  stateAdapters: gamesPageStateAdapters,
  roomSocketRuntime: gamesRoomSocketRuntime,
  roomChatRuntime: gamesRoomChatRuntime,
  patchGamesState,
  resetGamesState,
  domAdapters: gamesPageDomAdapters,
  acceptCurrentAnswerLocally,
  syncQuestionReportButtons,
});
connectGamesPageRuntimeRefs(gamesPageRuntimeRefs, gamesPageActionHandlers);
const bindGamesEvents = createGamesPageEventsConfig({
  actionHandlers: gamesPageActionHandlers,
  getState: () => gamesState,
  reportedQuestionKeys,
  reportingQuestionKeys,
  patchGamesState,
  setGamesState,
  setGamesOverlayState,
  setQuestionReportOverlayState,
  setRoomChatState,
  getLobbyRenderOptions,
  isRoomCreatedByCurrentUser,
  shouldBlockFullRoomJoin,
  showRoomFullMessage,
  syncQuestionReportButtons,
  getCurrentPlayer,
  getRoomTitleValue,
});
const getGamesPageLifecycleOptions = createGamesPageLifecycleConfig({
  setRoot: gamesPageRoot.setRoot,
  getRoot: gamesPageRoot.getRoot,
  bindEvents: bindGamesEvents,
  countdownRuntime: gamesCountdownRuntime,
  roomsAutoRefreshRuntime,
  roomStateRefreshRuntime,
  roomChatRuntime: gamesRoomChatRuntime,
  roomSocketRuntime: gamesRoomSocketRuntime,
  domAdapters: gamesPageDomAdapters,
  hasRoom: () => Boolean(gamesState.room),
  refreshCurrentRoomSilently: gamesPageActionHandlers.refreshCurrentRoomSilently,
});
const gamesPageRenderOptions = createGamesPageRenderConfig({
  hasSessionUser: () => Boolean(getSessionUser()),
  renderPageShell: renderGamesPageShell,
  hydrateRoom: hydrateGameRoomAvatars,
  rememberRoomTitle,
  recoverRoomAccess,
});
const gamesPageBootstrap = createGamesPageBootstrap({
  getLifecycleOptions: getGamesPageLifecycleOptions,
});

export async function renderGames(
  params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  return renderGamesPage(params, signal, gamesPageRenderOptions);
}

export const initGames = gamesPageBootstrap.init;
bindGamesPageBootstrapEvents(gamesPageBootstrap);
