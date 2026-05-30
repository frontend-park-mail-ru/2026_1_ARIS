import { escapeHtml } from "../../../../../utils/avatar";
import { renderActiveRoomPanel } from "./active";
import { renderWaitingRoomFooter } from "./footer";
import { renderRoomHeader } from "./header";
import type { RenderRoomPanelOptions } from "./types";

export type { RenderRoomPanelOptions } from "./types";

/** Рендерит панель комнаты ожидания, активной игры или итогов. */
export function renderRoomPanel(options: RenderRoomPanelOptions): string {
  const { room, gamePlay, playerList, passwordError } = options;
  if (room.status === "active") {
    return renderActiveRoomPanel(options);
  }

  return `
    <section class="games-panel content-card" data-games-room-id="${escapeHtml(room.id)}">
      ${options.showRoomHeader ? renderRoomHeader(options) : ""}
      ${room.status === "finished" ? gamePlay : ""}
      ${room.status === "waiting" ? playerList : ""}
      ${room.status === "waiting" ? passwordError : ""}
      ${renderWaitingRoomFooter(options)}
    </section>
  `;
}
