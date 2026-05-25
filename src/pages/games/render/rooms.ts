import { escapeHtml } from "../../../utils/avatar";
import { gameT } from "../shared/i18n";
import { getRoomAuthorName, renderRoomListItem } from "./rooms/card";
import type { RenderRoomsPanelOptions } from "./rooms/types";

export type { RenderRoomsPanelOptions } from "./rooms/types";

/** Рендерит список активных комнат с учетом поиска. */
export function renderRoomsList(options: RenderRoomsPanelOptions): string {
  const query = options.roomsSearchQuery.trim().toLowerCase();
  const rooms = options.rooms.filter(
    (room) =>
      room.status === "waiting" &&
      (!query ||
        getRoomAuthorName(room).toLowerCase().includes(query) ||
        options.getRoomTitleValue(room).toLowerCase().includes(query)),
  );

  if (options.roomsLoading) {
    return `<p class="games-empty">${escapeHtml(gameT("rooms.loading"))}</p>`;
  }

  if (options.roomsError) {
    return `<p class="games-message games-message--error">${escapeHtml(options.roomsError)}</p>`;
  }

  if (!rooms.length) {
    if (query) {
      return `<p class="games-empty">${escapeHtml(gameT("rooms.empty"))}</p>`;
    }

    return `
      <p class="games-empty">
        ${escapeHtml(gameT("rooms.noRooms"))}
        <button type="button" class="games-empty__link" data-games-lobby-mode="create">${escapeHtml(gameT("room.emptyCreate"))}</button>
      </p>
    `;
  }

  return `
    <div class="games-room-list">
      ${rooms.map((room) => renderRoomListItem(room, options)).join("")}
    </div>
  `;
}

/** Рендерит панель списка комнат в общем лобби игры. */
export function renderRoomsPanel(options: RenderRoomsPanelOptions): string {
  return `
    <div class="games-lobby-subview">
      <div class="games-rooms-toolbar">
        <button type="button" class="games-button games-button--ghost games-rooms-toolbar__refresh" data-games-refresh-rooms ${options.roomsLoading ? "disabled" : ""}>
          ${escapeHtml(gameT("rooms.refresh"))}
        </button>
        <div class="games-rooms-toolbar__auto-refresh">
          <span class="games-rooms-toolbar__label">${escapeHtml(gameT("rooms.autoRefresh"))}</span>
          <fieldset class="games-ready-segmented games-ready-segmented--compact" aria-label="${escapeHtml(gameT("rooms.autoRefreshAria"))}">
            <label class="games-ready-segmented__option" data-games-rooms-auto-refresh="true">
              <input
                type="radio"
                class="games-ready-segmented__input"
                name="games-rooms-auto-refresh"
                value="true"
                ${options.roomsAutoRefreshEnabled ? "checked" : ""}
                aria-label="${escapeHtml(gameT("rooms.yes"))}"
              />
              <span class="games-ready-segmented__text">${escapeHtml(gameT("rooms.yes"))}</span>
            </label>
            <label class="games-ready-segmented__option" data-games-rooms-auto-refresh="false">
              <input
                type="radio"
                class="games-ready-segmented__input"
                name="games-rooms-auto-refresh"
                value="false"
                ${options.roomsAutoRefreshEnabled ? "" : "checked"}
                aria-label="${escapeHtml(gameT("rooms.no"))}"
              />
              <span class="games-ready-segmented__text">${escapeHtml(gameT("rooms.no"))}</span>
            </label>
          </fieldset>
        </div>
      </div>
      <label class="games-room-search search-field">
        <span class="search-field__icon" aria-hidden="true">
          <img src="/assets/img/icons/search.svg" alt="">
        </span>
        <input class="search-field__input" type="search" name="roomsSearch" value="${escapeHtml(options.roomsSearchQuery)}" placeholder="${escapeHtml(gameT("rooms.searchPlaceholder"))}" aria-label="${escapeHtml(gameT("rooms.searchAria"))}" data-games-rooms-search>
      </label>
      <div data-games-room-list>
        ${renderRoomsList(options)}
      </div>
    </div>
  `;
}
