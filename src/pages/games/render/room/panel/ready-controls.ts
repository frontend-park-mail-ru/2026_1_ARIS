import type { RenderRoomPanelOptions } from "./types";

/** Рендерит переключатель готовности текущего игрока. */
export function renderReadyControls(options: RenderRoomPanelOptions): string {
  const { room, currentPlayer, loading } = options;
  if (room.status !== "waiting") return "";
  return `
    <div class="games-room-header__controls">
      <div class="games-room-header__controls-stack">
        <fieldset class="games-ready-segmented" aria-label="Готовность к игре">
          <label class="games-ready-segmented__option" data-games-ready-toggle="false">
            <input
              type="radio"
              class="games-ready-segmented__input"
              name="games-ready"
              value="false"
              ${currentPlayer?.isReady ? "" : "checked"}
              ${loading ? "disabled" : ""}
              aria-label="Не готов"
            />
            <span class="games-ready-segmented__text">Не готов</span>
          </label>
          <label class="games-ready-segmented__option" data-games-ready-toggle="true">
            <input
              type="radio"
              class="games-ready-segmented__input"
              name="games-ready"
              value="true"
              ${currentPlayer?.isReady ? "checked" : ""}
              ${loading ? "disabled" : ""}
              aria-label="Готов"
            />
            <span class="games-ready-segmented__text">Готов</span>
          </label>
        </fieldset>
        <span class="games-room-header__controls-hint">
          <button
            type="button"
            class="games-catalog-card__hint-button games-field-hint-button"
            data-games-catalog-hint
            aria-controls="games-ready-status-rules-hint"
            aria-label="Показать подсказку о статусе готовности"
            aria-expanded="false"
          >
            ?
          </button>
          <span id="games-ready-status-rules-hint" class="games-field-popover" popover="manual" hidden>
            Администратор может начать игру только когда все игроки выставили статус "Готов"
          </span>
        </span>
      </div>
    </div>
  `;
}
