/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { bindGamesClickEvents, type BindGamesClickEventsOptions } from "./clicks";

/** Создаёт зависимости click-dispatcher для тестов. */
function createOptions(overrides: Partial<BindGamesClickEventsOptions> = {}) {
  const options: BindGamesClickEventsOptions = {
    profileNavigation: {
      room: null,
      setGamesOverlayState: vi.fn(),
      navigateToConfirmedProfile: vi.fn(),
      openProfileNavigationConfirm: vi.fn(),
    },
    hints: {
      root: document.createElement("div"),
      participantsStatusHintOpen: false,
      readyStatusHintOpen: false,
      closeGameCatalogHints: vi.fn(),
      getGameHintById: vi.fn(() => null),
      hideGameHint: vi.fn(),
      showGameHint: vi.fn(),
      updateGamesPopoverViewportOffset: vi.fn(),
      scheduleGamesPopoverViewportOffsets: vi.fn(),
      setGamesState: vi.fn(),
    },
    lobby: {
      roomsAutoRefreshEnabled: false,
      messageReturnRoomLabel: "",
      selectLobbyMode: vi.fn(),
      loadWaitingRooms: vi.fn(),
      loadLeaderboard: vi.fn(),
      handleBackToRooms: vi.fn(),
      handleReturnToRoom: vi.fn(),
      setGamesState: vi.fn(),
      showAppToast: vi.fn(),
      getErrorMessage: (_error, fallback) => fallback,
      getVoluntaryLeaveMessage: () => "",
      getVoluntaryLeaveReturnLabel: () => "",
    },
    copy: {
      handleCopyInviteCode: vi.fn(),
      handleCopyRoomTitle: vi.fn(),
      setGamesState: vi.fn(),
    },
    joinPassword: {
      rooms: [],
      isRoomCreatedByCurrentUser: vi.fn(() => false),
      shouldBlockFullRoomJoin: vi.fn(() => false),
      handleJoinOwnListedRoom: vi.fn(),
      showRoomFullMessage: vi.fn(),
      patchGamesState: vi.fn(),
      setGamesState: vi.fn(),
      getErrorMessage: (_error, fallback) => fallback,
    },
    confirmModals: {
      state: { kickConfirmProfileId: "", adminConfirmProfileId: "" },
      handleDisbandRoom: vi.fn(),
      handleStartRoom: vi.fn(),
      handleExitGameToMenu: vi.fn(),
      handleKickPlayer: vi.fn(),
      handleAssignAdmin: vi.fn(),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
      getErrorMessage: (_error, fallback) => fallback,
    },
    questionReport: {
      state: { reportConfirmQuestionKey: "" },
      closeGamesMenus: () => ({}),
      handleReportQuestion: vi.fn(),
      handleReportQuestionError: vi.fn(),
      setQuestionReportOverlayState: vi.fn(),
    },
    roomActions: {
      room: null,
      currentPlayerReady: false,
      handlePauseRoom: vi.fn(),
      handleForceResumeRoom: vi.fn(),
      handleRoomRankedToggle: vi.fn(),
      handleReadyToggle: vi.fn(),
      handleReplayToggle: vi.fn(),
      setGamesState: vi.fn(),
      getErrorMessage: (_error, fallback) => fallback,
    },
    roomMenus: {
      state: {
        room: null,
        playerMenuProfileId: "",
        questionMenuKey: "",
        titleMenuOpen: false,
        passwordMenuOpen: false,
      },
      reportedQuestionKeys: new Set(),
      reportingQuestionKeys: new Set(),
      getFloatingMenuAnchor: () => ({ floatingMenuAnchorX: 0, floatingMenuAnchorY: 0 }),
      closeGamesMenus: () => ({}),
      getRoomTitleValue: () => "",
      handleCopyQuestionAnswer: vi.fn(),
      handleCopyRoomTitle: vi.fn(),
      handleShowPassword: vi.fn(),
      handleRemovePassword: vi.fn(),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
      showAppToast: vi.fn(),
      getErrorMessage: (_error, fallback) => fallback,
    },
    ...overrides,
  };
  return options;
}

describe("games click dispatcher", () => {
  it("передаёт защищённую profile-ссылку в profile navigation handler", () => {
    const root = document.createElement("div");
    const link = document.createElement("a");
    link.href = "/id1";
    link.dataset.gamesProfileLink = "";
    root.appendChild(link);
    const openProfileNavigationConfirm = vi.fn();
    const options = createOptions({
      profileNavigation: {
        ...createOptions().profileNavigation,
        room: { status: "active" } as GameRoom,
        openProfileNavigationConfirm,
      },
      hints: { ...createOptions().hints, root },
    });

    bindGamesClickEvents(root, options);
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(openProfileNavigationConfirm).toHaveBeenCalledWith(link);
  });

  it("передаёт lobby-mode кнопку в lobby handler", () => {
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.dataset.gamesLobbyMode = "rooms";
    root.appendChild(button);
    const selectLobbyMode = vi.fn().mockResolvedValue(undefined);
    const options = createOptions({
      lobby: {
        ...createOptions().lobby,
        selectLobbyMode,
      },
      hints: { ...createOptions().hints, root },
    });

    bindGamesClickEvents(root, options);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(selectLobbyMode).toHaveBeenCalledWith("rooms");
  });

  it("берёт актуальные options при каждом click", () => {
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.dataset.gamesLobbyMode = "rooms";
    root.appendChild(button);
    const firstSelectLobbyMode = vi.fn().mockResolvedValue(undefined);
    const secondSelectLobbyMode = vi.fn().mockResolvedValue(undefined);
    let selectLobbyMode = firstSelectLobbyMode;
    const getOptions = vi.fn(() =>
      createOptions({
        lobby: {
          ...createOptions().lobby,
          selectLobbyMode,
        },
        hints: { ...createOptions().hints, root },
      }),
    );

    bindGamesClickEvents(root, getOptions);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    selectLobbyMode = secondSelectLobbyMode;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(getOptions).toHaveBeenCalledTimes(2);
    expect(firstSelectLobbyMode).toHaveBeenCalledWith("rooms");
    expect(secondSelectLobbyMode).toHaveBeenCalledWith("rooms");
  });
});
