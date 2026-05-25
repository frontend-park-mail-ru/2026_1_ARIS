/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageRenderer } from "./page-renderer";

vi.mock("../../../components/header/header", () => ({
  renderHeader: () => "<header>Header</header>",
}));

vi.mock("../../../components/sidebar/sidebar", () => ({
  renderSidebar: () => "<aside>Sidebar</aside>",
}));

function createRenderer() {
  const state = createInitialGamesState();
  const syncButtons = vi.fn();
  const renderer = createGamesPageRenderer({
    getState: () => state,
    isCatalogRoute: () => false,
    reportedQuestionKeys: new Set<string>(),
    reportingQuestionKeys: new Set<string>(),
    questionReportUi: {
      getState: () => ({
        reportingKeys: new Set<string>(),
        reportedKeys: new Set<string>(),
        openQuestionKey: "",
      }),
      syncButtons,
    },
    getCurrentProfileId: () => "profile-1",
    getCurrentPlayer: () => null,
    getPlayerAvatarUrl: () => "",
    getPlayerFullName: (player: GamePlayer) => player.name || "Игрок",
    getRoomTitleValue: (room: GameRoom | null) => room?.title ?? "",
    getRoomPasswordDisplayValue: () => "Без пароля",
    getRoomChatAuthorName: (_room: GameRoom, message: GameRoomMessage) =>
      message.authorName || "Игрок",
    getRoomChatAuthorFirstName: (_room: GameRoom, message: GameRoomMessage) =>
      message.authorFirstName || "Игрок",
    getRoomChatAuthorAvatar: () => "",
    getRoomChatPlayer: () => null,
    shouldBlockFullRoomJoin: () => false,
    isCurrentRoomCreator: () => false,
  });

  return { renderer, state, syncButtons };
}

describe("games page renderer", () => {
  it("рендерит inline-ошибку только для активной цели", () => {
    const { renderer, state } = createRenderer();
    state.error = "<Ошибка>";
    state.errorTarget = "footer";

    expect(renderer.renderInlineGameError("answer")).toBe("");
    expect(renderer.renderInlineGameError("footer")).toContain("&lt;Ошибка&gt;");
  });

  it("синхронизирует кнопки жалобы через question report ui", () => {
    const { renderer, syncButtons } = createRenderer();

    renderer.syncQuestionReportButtons("q-1");

    expect(syncButtons).toHaveBeenCalledWith("q-1");
  });

  it("собирает app shell страницы игр", () => {
    const { renderer } = createRenderer();

    const html = renderer.renderGamesPageShellContent();

    expect(html).toContain("<header>Header</header>");
    expect(html).toContain("data-games-page");
    expect(html).toContain("games-panel");
  });
});
