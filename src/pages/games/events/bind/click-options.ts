import {
  closeGameCatalogHints,
  getGameHintById,
  hideGameHint,
  showGameHint,
  updateGamesPopoverViewportOffset,
} from "../../shared/popovers";
import { gameT } from "../../shared/i18n";
import { setFloatingMenuAnchor } from "../../render/floating-menu";
import type { BindGamesPageEventsOptions, GamesEventsRoot } from "./types";

/**
 * Собирает актуальные click-зависимости из текущего snapshot состояния.
 */
export function getGamesClickEventOptions(
  root: GamesEventsRoot,
  options: BindGamesPageEventsOptions,
) {
  const state = options.getState();
  return {
    profileNavigation: {
      room: state.room,
      setGamesOverlayState: options.setGamesOverlayState,
      navigateToConfirmedProfile: options.navigateToConfirmedProfile,
      openProfileNavigationConfirm: options.openProfileNavigationConfirm,
    },
    hints: {
      root,
      participantsStatusHintOpen: state.participantsStatusHintOpen,
      readyStatusHintOpen: state.readyStatusHintOpen,
      closeGameCatalogHints,
      getGameHintById,
      hideGameHint,
      showGameHint,
      updateGamesPopoverViewportOffset,
      scheduleGamesPopoverViewportOffsets: options.scheduleGamesPopoverViewportOffsets,
      setGamesState: options.setGamesState,
    },
    lobby: {
      roomsAutoRefreshEnabled: state.roomsAutoRefreshEnabled,
      messageReturnRoomLabel: state.messageReturnRoomLabel,
      selectLobbyMode: options.selectLobbyMode,
      loadWaitingRooms: options.loadWaitingRooms,
      loadLeaderboard: options.loadLeaderboard,
      handleBackToRooms: options.handleBackToRooms,
      handleReturnToRoom: options.handleReturnToRoom,
      setGamesState: options.setGamesState,
      showAppToast: options.showAppToast,
      getErrorMessage: options.getErrorMessage,
      getVoluntaryLeaveMessage: options.getVoluntaryLeaveMessage,
      getVoluntaryLeaveReturnLabel: options.getVoluntaryLeaveReturnLabel,
    },
    copy: {
      handleCopyInviteCode: options.handleCopyInviteCode,
      handleCopyRoomTitle: options.handleCopyRoomTitle,
      setGamesState: options.setGamesState,
    },
    joinPassword: {
      rooms: state.rooms,
      isRoomCreatedByCurrentUser: options.isRoomCreatedByCurrentUser,
      shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
      handleJoinOwnListedRoom: options.handleJoinOwnListedRoom,
      showRoomFullMessage: options.showRoomFullMessage,
      patchGamesState: options.patchGamesState,
      setGamesState: options.setGamesState,
      getErrorMessage: options.getErrorMessage,
    },
    confirmModals: {
      state: {
        kickConfirmProfileId: state.kickConfirmProfileId,
        adminConfirmProfileId: state.adminConfirmProfileId,
      },
      handleDisbandRoom: options.handleDisbandRoom,
      handleStartRoom: options.handleStartRoom,
      handleExitGameToMenu: options.handleExitGameToMenu,
      handleKickPlayer: options.handleKickPlayer,
      handleAssignAdmin: options.handleAssignAdmin,
      setGamesState: options.setGamesState,
      setGamesOverlayState: options.setGamesOverlayState,
      getErrorMessage: options.getErrorMessage,
    },
    questionReport: {
      state: {
        reportConfirmQuestionKey: state.reportConfirmQuestionKey,
      },
      closeGamesMenus: options.closeGamesMenus,
      handleReportQuestion: options.handleReportQuestion,
      handleReportQuestionError: (questionKey: string, error: unknown) => {
        options.reportingQuestionKeys.delete(questionKey);
        options.syncQuestionReportButtons(questionKey);
        options.showAppToast(options.getErrorMessage(error, gameT("report.submitError")));
      },
      setQuestionReportOverlayState: options.setQuestionReportOverlayState,
    },
    roomActions: {
      room: state.room,
      currentPlayerReady: Boolean(options.getCurrentPlayer(state.room)?.isReady),
      handlePauseRoom: options.handlePauseRoom,
      handleForceResumeRoom: options.handleForceResumeRoom,
      handleRoomRankedToggle: options.handleRoomRankedToggle,
      handleReadyToggle: options.handleReadyToggle,
      handleReplayToggle: options.handleReplayToggle,
      setGamesState: options.setGamesState,
      getErrorMessage: options.getErrorMessage,
    },
    roomMenus: {
      state: {
        room: state.room,
        playerMenuProfileId: state.playerMenuProfileId,
        questionMenuKey: state.questionMenuKey,
        titleMenuOpen: state.titleMenuOpen,
        passwordMenuOpen: state.passwordMenuOpen,
      },
      reportedQuestionKeys: options.reportedQuestionKeys,
      reportingQuestionKeys: options.reportingQuestionKeys,
      getFloatingMenuAnchor: setFloatingMenuAnchor,
      closeGamesMenus: options.closeGamesMenus,
      getRoomTitleValue: options.getRoomTitleValue,
      handleCopyQuestionAnswer: options.handleCopyQuestionAnswer,
      handleCopyRoomTitle: options.handleCopyRoomTitle,
      handleShowPassword: options.handleShowPassword,
      handleRemovePassword: options.handleRemovePassword,
      setGamesState: options.setGamesState,
      setGamesOverlayState: options.setGamesOverlayState,
      showAppToast: options.showAppToast,
      getErrorMessage: options.getErrorMessage,
    },
  };
}
