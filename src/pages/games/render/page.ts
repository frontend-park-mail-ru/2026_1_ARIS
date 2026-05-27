import { escapeHtml } from "../../../utils/avatar";
import { gameT } from "../shared/i18n";
import type { GamesPageState } from "../state/store";

export type RenderGamesContentOptions = {
  state: GamesPageState;
  isCatalogRoute: boolean;
  mainPanel: string;
  catalog: string;
  roomChat: string;
};

export type RenderGamesShellOptions = {
  state: GamesPageState;
  content: string;
  overlay: string;
};

/**
 * Рендерит информационное сообщение над основным контентом игр.
 */
export function renderGamesMessage(state: GamesPageState): string {
  if (!state.message) return "";
  return `
    <p class="games-message">
      <span class="games-message__icon" aria-hidden="true">!</span>
      <span>
        ${escapeHtml(state.message)}
        ${
          state.messageReturnRoomId
            ? `<button type="button" class="games-message__link" data-games-return-room="${escapeHtml(state.messageReturnRoomId)}">${escapeHtml(state.messageReturnRoomLabel || gameT("page.returnRoom"))}</button>`
            : state.messageRefreshRooms
              ? `<button type="button" class="games-message__link" data-games-refresh-rooms-link>${escapeHtml(gameT("page.refreshRooms"))}</button>`
              : ""
        }
      </span>
    </p>
  `;
}

/**
 * Рендерит центральный контент страницы игр.
 */
export function renderGamesContent(options: RenderGamesContentOptions): string {
  const { state } = options;
  if (options.isCatalogRoute) {
    return options.catalog;
  }

  const hasWaitingRoom = state.room?.status === "waiting";
  return `
    <div class="games-layout${state.room && !hasWaitingRoom ? " games-layout--room" : ""}${hasWaitingRoom ? " games-layout--with-chat" : ""}">
      ${renderGamesMessage(state)}
      <div class="games-main">${options.mainPanel}</div>
      ${hasWaitingRoom && state.room ? `<aside data-games-external-chat>${options.roomChat}</aside>` : ""}
    </div>
  `;
}

/**
 * Рендерит shell страницы игр с content и overlay областями.
 */
export function renderGamesShell(options: RenderGamesShellOptions): string {
  return `
    <section class="games-page" data-games-page data-room-id="${escapeHtml(options.state.roomId)}">
      <div data-games-content>
        ${options.content}
      </div>
      <div data-games-overlay>
        ${options.overlay}
      </div>
    </section>
  `;
}
