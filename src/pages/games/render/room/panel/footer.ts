import { escapeHtml } from "../../../../../utils/avatar";
import type { RenderRoomPanelOptions } from "./types";

/** Рендерит кнопку старта с подсказками по недостающим условиям. */
function renderStartButton(options: RenderRoomPanelOptions): string {
  const { canStartRoom, loading, startTooltipLines } = options;
  return `
    <div class="games-tooltip-anchor${startTooltipLines.length ? " games-tooltip-anchor--with-tooltip" : ""}">
      <button type="button" class="games-button games-button--primary games-button--start" data-games-start-open ${canStartRoom && !loading ? "" : "disabled"}>
        Начать игру
      </button>
      ${
        startTooltipLines.length
          ? `
            <div class="games-tooltip-anchor__popup" role="tooltip">
              ${startTooltipLines
                .map(
                  (line) => `<span class="games-tooltip-anchor__line">${escapeHtml(line)}</span>`,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

/** Рендерит destructive-действие выхода или роспуска комнаты. */
function renderRoomExitAction(options: RenderRoomPanelOptions): string {
  const { canDisbandRoom, canLeaveRoom, loading } = options;
  if (canDisbandRoom) {
    return `
      <button type="button" class="games-button games-button--danger" data-games-disband-open ${loading ? "disabled" : ""}>
        Распустить комнату
      </button>
    `;
  }

  if (canLeaveRoom) {
    return `
      <button type="button" class="games-button games-button--danger" data-games-leave-open ${loading ? "disabled" : ""}>
        Покинуть комнату
      </button>
    `;
  }

  return "";
}

/** Рендерит footer комнаты ожидания с действиями администратора или участника. */
export function renderWaitingRoomFooter(options: RenderRoomPanelOptions): string {
  if (options.room.status !== "waiting") return "";
  return `
    <div class="games-room-footer">
      <div class="games-room-footer__actions">
        ${renderStartButton(options)}
        ${renderRoomExitAction(options)}
      </div>
      ${options.footerError}
    </div>
  `;
}
