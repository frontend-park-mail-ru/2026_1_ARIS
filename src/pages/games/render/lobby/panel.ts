import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import { getPrimaryGameCatalogItem } from "../../shared/registry";
import type { RenderCreateRoomPanelOptions } from "./types";

/** Рендерит каркас лобби выбранной игры вокруг активного подпредставления. */
export function renderCreateRoomPanel(options: RenderCreateRoomPanelOptions): string {
  const game = getPrimaryGameCatalogItem();
  const isLobbyMenu = options.lobbyMode === "menu";
  const isJoinMode = options.lobbyMode === "join";
  const isRoomsMode = options.lobbyMode === "rooms";
  const isCreateMode = options.lobbyMode === "create";
  const isLeaderboardMode = options.lobbyMode === "leaderboard";
  const gameTitle = game.title;
  const title = isCreateMode
    ? gameT("panel.createTitle", { game: gameTitle })
    : isJoinMode
      ? gameT("panel.joinTitle", { game: gameTitle })
      : isRoomsMode
        ? gameT("panel.roomsTitle", { game: gameTitle })
        : isLeaderboardMode
          ? gameT("panel.leaderboardTitle", { game: gameTitle })
          : gameTitle;

  return `
    <section class="games-panel content-card">
      <header class="games-panel__header">
        <div>
          <div class="games-panel__title-row">
            <h1 class="games-panel__title">${escapeHtml(title)}</h1>
            <span class="games-panel__title-hint">
              <button
                type="button"
                class="games-catalog-card__hint-button"
                data-games-catalog-hint
                aria-controls="games-panel-description-hint"
                aria-label="${escapeHtml(gameT("catalog.showDescription"))}"
                aria-expanded="false"
              >
                ?
              </button>
              <span id="games-panel-description-hint" class="games-field-popover" popover="manual" hidden>
                ${escapeHtml(game.description)}
              </span>
            </span>
          </div>
        </div>
        ${
          isLobbyMenu
            ? `<a href="/games" class="games-button games-button--ghost games-panel__back-button" data-link>${escapeHtml(gameT("lobby.back"))}</a>`
            : isJoinMode || isRoomsMode || isCreateMode || isLeaderboardMode
              ? `<button type="button" class="games-button games-button--ghost games-panel__back-button" data-games-lobby-mode="menu">${escapeHtml(gameT("lobby.back"))}</button>`
              : ""
        }
      </header>

      ${options.content}
    </section>
  `;
}
