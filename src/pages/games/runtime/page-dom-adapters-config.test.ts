/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageDomAdaptersConfig } from "./page-dom-adapters-config";

describe("games page dom adapters config", () => {
  it("создаёт DOM adapters из state, render callbacks и runtime", () => {
    const state = createInitialGamesState();
    state.room = { id: "room-1" } as GameRoom;
    state.submittedQuestionId = "question-1";
    state.submittedAnswerValue = "42";
    const roomSocketRuntime = { sync: vi.fn() };
    const adapters = createGamesPageDomAdaptersConfig({
      getRoot: () => document.body,
      getState: () => state,
      renderContent: vi.fn(() => ""),
      renderPageShell: vi.fn(() => ""),
      renderOverlay: vi.fn(() => ""),
      renderQuestionReportOverlay: vi.fn(() => ""),
      renderPlayersRail: vi.fn(() => ""),
      renderRoomChat: vi.fn(() => ""),
      countdownRuntime: { start: vi.fn() },
      roomChatRuntime: { sync: vi.fn() },
      roomSocketRuntime,
      roomsAutoRefreshRuntime: { sync: vi.fn() },
      roomStateRefreshRuntime: { sync: vi.fn() },
    });

    adapters.syncRoomSubscription();

    expect(roomSocketRuntime.sync).toHaveBeenCalledWith("room-1");
    expect(adapters.getDomRefreshOptions().room).toBe(state.room);
  });
});
