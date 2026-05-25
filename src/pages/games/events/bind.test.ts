/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createInitialGamesState, type GamesPageState } from "../state/store";
import { bindGamesPageEvents, type BindGamesPageEventsOptions, type GamesEventsRoot } from "./bind";

/** Создаёт зависимости общего binder событий игр. */
function createOptions(state: GamesPageState): BindGamesPageEventsOptions {
  return {
    getState: () => state,
    reportedQuestionKeys: new Set(),
    reportingQuestionKeys: new Set(),
    patchGamesState: vi.fn((patch) => Object.assign(state, patch)),
    setGamesState: vi.fn((patch) => Object.assign(state, patch)),
    setGamesOverlayState: vi.fn(),
    setQuestionReportOverlayState: vi.fn(),
    setRoomChatState: vi.fn(),
    renderRoomsList: vi.fn(() => "<p>rooms</p>"),
    scheduleGamesPopoverViewportOffsets: vi.fn(),
    getErrorMessage: (_error, fallback) => fallback,
    showAppToast: vi.fn(),
    selectLobbyMode: vi.fn().mockResolvedValue(undefined),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    loadLeaderboard: vi.fn().mockResolvedValue(undefined),
    handleBackToRooms: vi.fn().mockResolvedValue(undefined),
    handleReturnToRoom: vi.fn().mockResolvedValue(undefined),
    getVoluntaryLeaveMessage: () => "",
    getVoluntaryLeaveReturnLabel: () => "",
    isRoomCreatedByCurrentUser: () => false,
    shouldBlockFullRoomJoin: () => false,
    handleJoinOwnListedRoom: vi.fn().mockResolvedValue(undefined),
    showRoomFullMessage: vi.fn(),
    handleDisbandRoom: vi.fn().mockResolvedValue(undefined),
    handleStartRoom: vi.fn().mockResolvedValue(undefined),
    handleExitGameToMenu: vi.fn().mockResolvedValue(undefined),
    handleKickPlayer: vi.fn().mockResolvedValue(undefined),
    handleAssignAdmin: vi.fn().mockResolvedValue(undefined),
    closeGamesMenus: () => ({}),
    handleReportQuestion: vi.fn().mockResolvedValue(undefined),
    syncQuestionReportButtons: vi.fn(),
    getCurrentPlayer: () => null,
    handlePauseRoom: vi.fn().mockResolvedValue(undefined),
    handleForceResumeRoom: vi.fn().mockResolvedValue(undefined),
    handleRoomRankedToggle: vi.fn().mockResolvedValue(undefined),
    handleReadyToggle: vi.fn().mockResolvedValue(undefined),
    handleReplayToggle: vi.fn().mockResolvedValue(undefined),
    getRoomTitleValue: () => "",
    handleCopyInviteCode: vi.fn().mockResolvedValue(undefined),
    handleCopyRoomTitle: vi.fn().mockResolvedValue(undefined),
    handleCopyQuestionAnswer: vi.fn().mockResolvedValue(undefined),
    handleShowPassword: vi.fn().mockResolvedValue(undefined),
    handleRemovePassword: vi.fn().mockResolvedValue(undefined),
    navigateToConfirmedProfile: vi.fn(),
    openProfileNavigationConfirm: vi.fn(),
    handleSubmitRoomChat: vi.fn().mockResolvedValue(undefined),
    handleCreateRoom: vi.fn().mockResolvedValue(undefined),
    handleJoinRoom: vi.fn().mockResolvedValue(undefined),
    handleJoinListedRoom: vi.fn().mockResolvedValue(undefined),
    handleRenameRoomTitle: vi.fn().mockResolvedValue(undefined),
    handlePasswordForm: vi.fn().mockResolvedValue(undefined),
    handleSubmitAnswer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("games events binder", () => {
  it("подключает submit и не дублирует обработчики при повторной привязке", async () => {
    const root = document.createElement("div") as HTMLElement & GamesEventsRoot;
    root.innerHTML = `<form data-games-room-chat-form></form>`;
    const form = root.querySelector<HTMLFormElement>("form")!;
    const state = createInitialGamesState();
    const options = createOptions(state);

    bindGamesPageEvents(root, options);
    bindGamesPageEvents(root, options);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(options.handleSubmitRoomChat).toHaveBeenCalledTimes(1);
  });

  it("передаёт lobby click в актуальный handler", () => {
    const root = document.createElement("div") as HTMLElement & GamesEventsRoot;
    root.innerHTML = `<button type="button" data-games-lobby-mode="rooms"></button>`;
    const button = root.querySelector<HTMLButtonElement>("button")!;
    const state = createInitialGamesState();
    const options = createOptions(state);

    bindGamesPageEvents(root, options);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(options.selectLobbyMode).toHaveBeenCalledWith("rooms");
  });
});
