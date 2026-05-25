import { escapeHtml } from "../../../../../utils/avatar";
import type { RenderRoomPanelOptions } from "./types";

/** Рендерит компактную активную комнату с игровой сценой. */
export function renderActiveRoomPanel(options: RenderRoomPanelOptions): string {
  const { room, pauseAction, footerError, gamePlay } = options;
  return `
    <section class="games-panel games-panel--play content-card" data-games-room-id="${escapeHtml(room.id)}">
      ${
        pauseAction
          ? `
            <header class="games-play-header games-play-header--compact">
              <div class="games-play-header__actions">
                ${pauseAction}
              </div>
            </header>
          `
          : ""
      }
      ${footerError}
      ${gamePlay}
    </section>
  `;
}
