/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageEventBinder } from "./page-binder";
import { bindGamesPageEvents } from "./bind";

vi.mock("./bind", async () => {
  const actual = await vi.importActual<typeof import("./bind")>("./bind");
  return {
    ...actual,
    bindGamesPageEvents: vi.fn(),
  };
});

/** Создаёт зависимости page-binder событий для тестов. */
function createOptions() {
  const state = createInitialGamesState();
  return {
    getState: () => state,
    reportedQuestionKeys: new Set<string>(),
    reportingQuestionKeys: new Set<string>(),
    patchGamesState: vi.fn(),
    setGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
    setQuestionReportOverlayState: vi.fn(),
    setRoomChatState: vi.fn(),
    scheduleGamesPopoverViewportOffsets: vi.fn(),
    getErrorMessage: (_error: unknown, fallback: string) => fallback,
    showAppToast: vi.fn(),
    selectLobbyMode: vi.fn(),
    loadWaitingRooms: vi.fn(),
    loadLeaderboard: vi.fn(),
    handleBackToRooms: vi.fn(),
    handleReturnToRoom: vi.fn(),
    isRoomCreatedByCurrentUser: vi.fn(),
    shouldBlockFullRoomJoin: vi.fn(() => false),
    handleJoinOwnListedRoom: vi.fn(),
    showRoomFullMessage: vi.fn(),
    handleDisbandRoom: vi.fn(),
    handleStartRoom: vi.fn(),
    handleExitGameToMenu: vi.fn(),
    handleKickPlayer: vi.fn(),
    handleAssignAdmin: vi.fn(),
    closeGamesMenus: vi.fn(() => ({})),
    handleReportQuestion: vi.fn(),
    syncQuestionReportButtons: vi.fn(),
    getCurrentPlayer: vi.fn(() => null),
    handlePauseRoom: vi.fn(),
    handleForceResumeRoom: vi.fn(),
    handleRoomRankedToggle: vi.fn(),
    handleReadyToggle: vi.fn(),
    handleReplayToggle: vi.fn(),
    getRoomTitleValue: vi.fn(() => "Комната"),
    handleCopyInviteCode: vi.fn(),
    handleCopyRoomTitle: vi.fn(),
    handleCopyQuestionAnswer: vi.fn(),
    handleShowPassword: vi.fn(),
    handleRemovePassword: vi.fn(),
    navigateToConfirmedProfile: vi.fn(),
    openProfileNavigationConfirm: vi.fn(),
    handleSubmitRoomChat: vi.fn(),
    handleCreateRoom: vi.fn(),
    handleJoinRoom: vi.fn(),
    handleJoinListedRoom: vi.fn(),
    handleRenameRoomTitle: vi.fn(),
    handlePasswordForm: vi.fn(),
    handleSubmitAnswer: vi.fn(),
    getLobbyRenderOptions: vi.fn(() => ({
      state,
      getPlayerAvatarUrl: vi.fn(() => ""),
      getPlayerFullName: vi.fn(() => ""),
      getRoomTitleValue: vi.fn(() => ""),
      shouldBlockFullRoomJoin: vi.fn(() => false),
    })),
  };
}

describe("games page event binder", () => {
  it("передаёт базовому binder собранные render и lifecycle callbacks", () => {
    const options = createOptions();
    const root = document.createElement("main");

    createGamesPageEventBinder(options)(root);

    const boundOptions = vi.mocked(bindGamesPageEvents).mock.calls[0]?.[1];
    expect(boundOptions?.renderRoomsList()).toContain("games-empty");
    expect(boundOptions?.getVoluntaryLeaveMessage()).toBeTruthy();
    expect(boundOptions?.getRoomTitleValue({ id: "room-1" } as GameRoom)).toBe("Комната");
  });
});
