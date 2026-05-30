import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import type { RenderRoomPanelOptions } from "./types";

/** Рендерит переключатель готовности текущего игрока. */
export function renderReadyControls(options: RenderRoomPanelOptions): string {
  const { room, currentPlayer, loading } = options;
  if (room.status !== "waiting") return "";
  if (room.isPublicLobby) return "";
  return `
    <div class="games-room-header__controls">
      <div class="games-room-header__controls-stack">
        <fieldset class="games-ready-segmented" aria-label="${escapeHtml(gameT("room.readyAria"))}">
          <label class="games-ready-segmented__option" data-games-ready-toggle="false">
            <input
              type="radio"
              class="games-ready-segmented__input"
              name="games-ready"
              value="false"
              ${currentPlayer?.isReady ? "" : "checked"}
              ${loading ? "disabled" : ""}
              aria-label="${escapeHtml(gameT("room.notReady"))}"
            />
            <span class="games-ready-segmented__text">${escapeHtml(gameT("room.notReady"))}</span>
          </label>
          <label class="games-ready-segmented__option" data-games-ready-toggle="true">
            <input
              type="radio"
              class="games-ready-segmented__input"
              name="games-ready"
              value="true"
              ${currentPlayer?.isReady ? "checked" : ""}
              ${loading ? "disabled" : ""}
              aria-label="${escapeHtml(gameT("room.ready"))}"
            />
            <span class="games-ready-segmented__text">${escapeHtml(gameT("room.ready"))}</span>
          </label>
        </fieldset>
        <span class="games-room-header__controls-hint">
          <button
            type="button"
            class="games-catalog-card__hint-button games-field-hint-button"
            data-games-catalog-hint
            aria-controls="games-ready-status-rules-hint"
            aria-label="${escapeHtml(gameT("room.readyHintAria"))}"
            aria-expanded="false"
          >
            ?
          </button>
          <span id="games-ready-status-rules-hint" class="games-field-popover" popover="manual" hidden>
            ${escapeHtml(gameT("room.readyHint"))}
          </span>
        </span>
      </div>
    </div>
  `;
}
