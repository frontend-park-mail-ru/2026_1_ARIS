import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import { renderRoomAccessDetails } from "./access-details";
import { renderReadyControls } from "./ready-controls";
import type { RenderRoomPanelOptions } from "./types";

/** Рендерит верхнюю строку заголовка комнаты. */
function renderRoomHeaderTop(options: RenderRoomPanelOptions): string {
  const { room, game, headingTitle, rankedBadge, showRulesHint } = options;
  return `
    <div class="games-room-header__top">
      <div class="games-room-heading-group">
        <h1 class="games-room-heading">${headingTitle}</h1>
        ${
          showRulesHint
            ? `
          <span class="games-room-heading-hint">
            <button
              type="button"
              class="games-catalog-card__hint-button games-room-rules-button"
              data-games-catalog-hint
              aria-controls="games-room-rules-hint"
              aria-label="${escapeHtml(gameT("room.rulesAria"))}"
              aria-expanded="false"
            >
              ?
            </button>
            <span id="games-room-rules-hint" class="games-field-popover" popover="manual" hidden>
              ${escapeHtml(game.description)}
            </span>
          </span>
        `
            : ""
        }
        ${room.status === "waiting" ? rankedBadge : ""}
      </div>
      ${
        room.status === "waiting" && !room.isPublicLobby
          ? `
            <button type="button" class="games-button games-button--secondary games-room-back-button" data-games-back-to-rooms>
              ${escapeHtml(gameT("lobby.back"))}
            </button>
          `
          : ""
      }
    </div>
  `;
}

/** Рендерит нижнюю строку заголовка комнаты со статусами участников. */
function renderRoomHeaderBottom(options: RenderRoomPanelOptions): string {
  const { room, lobbyCreator, participantsStatus, readyStatus } = options;
  return `
    <div class="games-room-header__bottom">
      <div class="games-room-header__summary">
        ${room.status === "waiting" ? lobbyCreator : ""}
        ${room.status === "finished" ? "" : `<p class="games-panel__subtitle">${participantsStatus}</p>`}
        ${
          room.status === "waiting" && readyStatus
            ? `<p class="games-panel__subtitle games-panel__subtitle--compact">${readyStatus}</p>`
            : ""
        }
      </div>
      ${renderReadyControls(options)}
    </div>
  `;
}

/** Рендерит заголовок комнаты ожидания или итогов. */
export function renderRoomHeader(options: RenderRoomPanelOptions): string {
  return `
    <header class="games-room-header">
      ${renderRoomHeaderTop(options)}
      ${renderRoomAccessDetails(options)}
      ${renderRoomHeaderBottom(options)}
    </header>
  `;
}
