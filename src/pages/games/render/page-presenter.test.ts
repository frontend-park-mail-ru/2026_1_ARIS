/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import {
  renderGamesAppShell,
  renderGamesPageContent,
  renderGamesPageShell,
} from "./page-presenter";

vi.mock("../../../components/header/header", () => ({
  renderHeader: () => "<header>Header</header>",
}));

vi.mock("../../../components/sidebar/sidebar", () => ({
  renderSidebar: () => "<aside>Sidebar</aside>",
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: "profile-1",
    maxPlayers: 2,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 20,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: null,
    players: [],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...patch,
  };
}

describe("games page presenter", () => {
  it("возвращает каталог без сборки лобби и комнаты", () => {
    const state = createInitialGamesState();
    const renderLobbyContent = vi.fn(() => "<div>Lobby</div>");
    const renderRoomPanel = vi.fn(() => "<div>Room</div>");
    const renderRoomChat = vi.fn(() => "<div>Chat</div>");

    const html = renderGamesPageContent({
      state,
      isCatalogRoute: true,
      renderLobbyContent,
      renderRoomPanel,
      renderRoomChat,
    });

    expect(html).toContain("games-catalog");
    expect(renderLobbyContent).not.toHaveBeenCalled();
    expect(renderRoomPanel).not.toHaveBeenCalled();
    expect(renderRoomChat).not.toHaveBeenCalled();
  });

  it("собирает панель комнаты и внешний чат для комнаты ожидания", () => {
    const state = createInitialGamesState();
    state.room = createRoom();

    const html = renderGamesPageContent({
      state,
      isCatalogRoute: false,
      renderLobbyContent: () => "<div>Lobby</div>",
      renderRoomPanel: () => "<section>Room panel</section>",
      renderRoomChat: () => "<aside>Room chat</aside>",
    });

    expect(html).toContain("<section>Room panel</section>");
    expect(html).toContain("<aside>Room chat</aside>");
    expect(html).toContain("data-games-external-chat");
  });

  it("собирает внешний чат для публичной комнаты ожидания", () => {
    const state = createInitialGamesState();
    state.room = createRoom({ isPublicLobby: true });

    const html = renderGamesPageContent({
      state,
      isCatalogRoute: false,
      renderLobbyContent: () => "<div>Lobby</div>",
      renderRoomPanel: () => "<section>Public room panel</section>",
      renderRoomChat: () => "<aside>Public room chat</aside>",
    });

    expect(html).toContain("<section>Public room panel</section>");
    expect(html).toContain("<aside>Public room chat</aside>");
    expect(html).toContain("data-games-external-chat");
  });

  it("собирает shell с overlay поверх page content", () => {
    const state = createInitialGamesState();
    state.roomId = "room-1";

    const html = renderGamesPageShell({
      state,
      isCatalogRoute: false,
      renderLobbyContent: () => "<div>Lobby body</div>",
      renderRoomPanel: () => "<div>Room panel</div>",
      renderRoomChat: () => "<div>Room chat</div>",
      renderOverlay: () => "<div>Overlay</div>",
    });

    expect(html).toContain('data-room-id="room-1"');
    expect(html).toContain("<div>Lobby body</div>");
    expect(html).toContain("<div>Overlay</div>");
  });

  it("собирает внешний app-shell активной комнаты через render callback-и", () => {
    const state = createInitialGamesState();
    state.room = createRoom({ status: "active" });

    const html = renderGamesAppShell({
      state,
      shell: "<section>Shell</section>",
      renderPlayersRail: () => "<nav>Players</nav>",
      renderRoomChat: () => "<aside>Chat</aside>",
    });

    expect(html).toContain("app-layout--game-room");
    expect(html).toContain("<section>Shell</section>");
    expect(html).toContain("<nav>Players</nav>");
    expect(html).toContain("<aside>Chat</aside>");
  });

  it("собирает публичную комнату ожидания в обычном app-shell", () => {
    const state = createInitialGamesState();
    state.room = createRoom({ isPublicLobby: true });

    const html = renderGamesAppShell({
      state,
      shell: "<section>Shell</section>",
      renderPlayersRail: () => "<nav>Players</nav>",
      renderRoomChat: () => "<aside>Chat</aside>",
    });

    expect(html).toContain("app-layout--content-wide");
    expect(html).toContain("<section>Shell</section>");
    expect(html).not.toContain("app-layout--game-room");
    expect(html).not.toContain("<nav>Players</nav>");
  });
});
