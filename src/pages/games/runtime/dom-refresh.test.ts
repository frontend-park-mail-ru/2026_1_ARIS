/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  refreshGamesDom,
  refreshQuestionReportOverlayDom,
  refreshRoomChatDom,
  shouldRerenderGamesShell,
  type GamesDomRefreshOptions,
} from "./dom-refresh";

/** Создаёт комнату для тестов DOM refresh. */
function createRoom(status: GameRoom["status"] = "active"): GameRoom {
  return { id: "room-1", status } as GameRoom;
}

/** Создаёт зависимости DOM refresh для тестов. */
function createOptions(overrides: Partial<GamesDomRefreshOptions> = {}): GamesDomRefreshOptions {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="app-page">
      <section data-games-content></section>
      <div data-games-overlay></div>
      <aside data-games-room-players-rail></aside>
      <aside data-games-external-chat></aside>
    </div>
  `;

  return {
    root,
    room: createRoom(),
    renderContent: () => "<main>Content</main>",
    renderPageShell: () =>
      '<div class="app-page"><section data-games-content>Shell</section></div>',
    renderOverlay: () => "<div>Overlay</div>",
    renderQuestionReportOverlay: () => "<form>Report</form>",
    renderPlayersRail: () => "<nav>Players</nav>",
    renderRoomChat: () => "<aside>Chat</aside>",
    startCountdown: vi.fn(),
    focusAnswerInput: vi.fn(),
    syncRoomSubscription: vi.fn(),
    syncRoomsAutoRefresh: vi.fn(),
    syncRoomStateRefresh: vi.fn(),
    syncRoomChatRuntime: vi.fn(),
    schedulePopoverOffsets: vi.fn(),
    scrollRoomChatToBottom: vi.fn(),
    ...overrides,
  };
}

describe("games dom refresh runtime", () => {
  it("обновляет content, overlay, rail и chat без пересборки shell", () => {
    const options = createOptions({ room: createRoom("waiting") });

    refreshGamesDom(options);

    expect(options.root?.querySelector("[data-games-content]")?.innerHTML).toContain("Content");
    expect(options.root?.querySelector("[data-games-overlay]")?.innerHTML).toContain("Overlay");
    expect(options.root?.querySelector("[data-games-room-players-rail]")?.innerHTML).toContain(
      "Players",
    );
    expect(options.root?.querySelector("[data-games-external-chat]")?.innerHTML).toContain("Chat");
    expect(options.syncRoomSubscription).not.toHaveBeenCalled();
    expect(options.syncRoomChatRuntime).toHaveBeenCalledOnce();
  });

  it("понимает, когда нужно пересобрать game-room layout", () => {
    const root = document.createElement("div");
    root.innerHTML = '<main class="app-layout app-layout--content-wide"></main>';

    expect(shouldRerenderGamesShell(root, createRoom("active"))).toBe(true);
    expect(shouldRerenderGamesShell(root, createRoom("waiting"))).toBe(false);
  });

  it("обновляет overlay жалобы или общий overlay fallback", () => {
    const options = createOptions();
    options.root!.querySelector("[data-games-overlay]")!.innerHTML =
      "<div data-games-report-overlay></div>";

    refreshQuestionReportOverlayDom(options);
    expect(options.root?.querySelector("[data-games-report-overlay]")?.innerHTML).toContain(
      "Report",
    );

    options.root!.querySelector("[data-games-overlay]")!.innerHTML = "";
    refreshQuestionReportOverlayDom(options);
    expect(options.root?.querySelector("[data-games-overlay]")?.innerHTML).toContain("Overlay");
  });

  it("обновляет внешний чат и управляет прокруткой", () => {
    const options = createOptions();

    refreshRoomChatDom(options, { forceScrollToBottom: true });

    expect(options.root?.querySelector("[data-games-external-chat]")?.innerHTML).toContain("Chat");
    expect(options.scrollRoomChatToBottom).toHaveBeenCalledWith(
      options.root?.querySelector("[data-games-external-chat]"),
      { ensureAfterRender: true },
    );
  });
});
