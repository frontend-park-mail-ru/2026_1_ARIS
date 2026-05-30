import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { renderGamesPageShell as renderGamesAppShellView } from "./app-shell";
import { renderCreateRoomPanel, renderGamesCatalog } from "./lobby";
import { renderPublicLobbyEntry } from "./public-lobby";
import {
  renderGamesContent as renderGamesContentView,
  renderGamesShell as renderGamesShellView,
} from "./page";

export type RenderGamesPageContentOptions = {
  state: GamesPageState;
  isCatalogRoute: boolean;
  renderLobbyContent: () => string;
  renderRoomPanel: (room: GameRoom) => string;
  renderRoomChat: (room: GameRoom) => string;
};

export type RenderGamesPageShellOptions = RenderGamesPageContentOptions & {
  renderOverlay: () => string;
};

export type RenderGamesAppShellOptions = {
  state: GamesPageState;
  isAuthorised?: boolean | undefined;
  shell: string;
  renderPlayersRail: (room: GameRoom) => string;
  renderRoomChat: (room: GameRoom) => string;
};

/**
 * Собирает центральный контент страницы игр из чистых render-блоков.
 */
export function renderGamesPageContent(options: RenderGamesPageContentOptions): string {
  const { state } = options;
  if (options.isCatalogRoute) {
    return renderGamesContentView({
      state,
      isCatalogRoute: true,
      catalog: renderGamesCatalog(),
      mainPanel: "",
      roomChat: "",
    });
  }

  const mainPanel = state.room
    ? options.renderRoomPanel(state.room)
    : state.publicInviteCode
      ? renderPublicLobbyEntry(state)
      : renderCreateRoomPanel({
          lobbyMode: state.lobbyMode,
          content: options.renderLobbyContent(),
        });

  return renderGamesContentView({
    state,
    isCatalogRoute: options.isCatalogRoute,
    catalog: renderGamesCatalog(),
    mainPanel,
    roomChat: state.room ? options.renderRoomChat(state.room) : "",
  });
}

/**
 * Собирает shell страницы игр с основным контентом и overlay-слоем.
 */
export function renderGamesPageShell(options: RenderGamesPageShellOptions): string {
  return renderGamesShellView({
    state: options.state,
    content: renderGamesPageContent(options),
    overlay: options.renderOverlay(),
  });
}

/**
 * Собирает внешний app-shell страницы игр с рейкой игроков и комнатным чатом.
 */
export function renderGamesAppShell(options: RenderGamesAppShellOptions): string {
  const { state } = options;
  return renderGamesAppShellView({
    room: state.room,
    isAuthorised: options.isAuthorised,
    shell: options.shell,
    playersRail: state.room ? options.renderPlayersRail(state.room) : "",
    roomChat: state.room ? options.renderRoomChat(state.room) : "",
  });
}
