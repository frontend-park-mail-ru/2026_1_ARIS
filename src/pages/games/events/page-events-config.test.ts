/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageEventsConfig } from "./page-events-config";
import { createGamesPageEventBinder } from "./page-binder";

vi.mock("./page-binder", async () => {
  const actual = await vi.importActual<typeof import("./page-binder")>("./page-binder");
  return {
    ...actual,
    createGamesPageEventBinder: vi.fn(() => vi.fn()),
  };
});

describe("games page events config", () => {
  it("собирает event binder из action handlers и UI callbacks", () => {
    const actionHandlers = {
      loadWaitingRooms: vi.fn(),
      handleReadyToggle: vi.fn(),
    } as never;
    const state = createInitialGamesState();

    createGamesPageEventsConfig({
      actionHandlers,
      getState: () => state,
      reportedQuestionKeys: new Set<string>(),
      reportingQuestionKeys: new Set<string>(),
      patchGamesState: vi.fn(),
      setGamesState: vi.fn(),
      setGamesOverlayState: vi.fn(),
      setQuestionReportOverlayState: vi.fn(),
      setRoomChatState: vi.fn(),
      getLobbyRenderOptions: vi.fn(),
      isRoomCreatedByCurrentUser: vi.fn(() => false),
      shouldBlockFullRoomJoin: vi.fn(() => false),
      showRoomFullMessage: vi.fn(),
      syncQuestionReportButtons: vi.fn(),
      getCurrentPlayer: vi.fn(() => null),
      getRoomTitleValue: vi.fn((room: GameRoom) => room.title),
    });

    expect(createGamesPageEventBinder).toHaveBeenCalledWith(
      expect.objectContaining({
        loadWaitingRooms: expect.any(Function),
        getState: expect.any(Function),
        showAppToast: expect.any(Function),
        closeGamesMenus: expect.any(Function),
      }),
    );
  });
});
