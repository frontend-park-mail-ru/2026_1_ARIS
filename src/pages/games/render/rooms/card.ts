import type { GameRoom } from "../../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { formatRoomModeLabel } from "../../room/profile/system-messages";
import { getRoomAuthor, getRoomMaxPlayers } from "../../room/selectors";
import { gameT } from "../../shared/i18n";
import type { RoomsRenderAdapter } from "./types";

/**
 * Возвращает имя администратора комнаты для списка комнат.
 */
export function getRoomAuthorName(room: GameRoom): string {
  const author = getRoomAuthor(room);
  return author?.name || gameT("rooms.admin");
}

/**
 * Рендерит автора комнаты в карточке списка комнат.
 */
function renderRoomAuthor(room: GameRoom, adapter: RoomsRenderAdapter): string {
  const author = getRoomAuthor(room);
  const name = getRoomAuthorName(room);
  const href = adapter.getProfileHref(author?.profileId ?? "");

  if (!author?.profileId) {
    return `
      <span class="games-room-author">
        ${renderAvatarMarkup("games-room-author__avatar", name, "", {
          width: 36,
          height: 36,
        })}
        <span>${escapeHtml(name)}</span>
      </span>
    `;
  }

  return `
    <a href="${href}" class="games-room-author games-room-author--link" data-link>
      ${renderAvatarMarkup("games-room-author__avatar", name, adapter.getPlayerAvatarUrl(author), {
        width: 36,
        height: 36,
      })}
      <span>${escapeHtml(name)}</span>
    </a>
  `;
}

/**
 * Рендерит режим комнаты в карточке списка комнат.
 */
function renderRoomListRankedStatus(room: GameRoom): string {
  return `<span>${formatRoomModeLabel(room.isRanked)}</span>`;
}

/**
 * Рендерит одну карточку комнаты в списке лобби.
 */
export function renderRoomListItem(room: GameRoom, adapter: RoomsRenderAdapter): string {
  const maxPlayers = getRoomMaxPlayers(room);
  const isJoinBlockedByFullRoom = adapter.shouldBlockFullRoomJoin(room);
  const canAttemptJoin = room.status === "waiting";
  const roomTitle = adapter.getRoomTitleValue(room);

  return `
    <article class="games-room-card">
      <div class="games-room-card__main">
        <strong class="games-room-card__title">${escapeHtml(roomTitle || gameT("rooms.untitled"))}</strong>
        <div class="games-room-card__summary">
          <div class="games-room-card__meta" aria-label="${escapeHtml(gameT("rooms.paramsAria"))}">
            ${renderRoomAuthor(room, adapter)}
            <span class="games-room-card__separator" aria-hidden="true"></span>
            <span>${escapeHtml(gameT("rooms.participants", { current: room.players.length, max: maxPlayers }))}</span>
            <span class="games-room-card__separator" aria-hidden="true"></span>
            <span>${escapeHtml(room.hasPassword ? gameT("rooms.hasPassword") : gameT("rooms.noPassword"))}</span>
            <span class="games-room-card__separator" aria-hidden="true"></span>
            ${renderRoomListRankedStatus(room)}
          </div>
        </div>
      </div>

      <form class="games-room-card__join" data-games-join-listed-room>
        <input type="hidden" name="roomId" value="${escapeHtml(room.id)}">
        ${room.inviteCode ? `<input type="hidden" name="inviteCode" value="${escapeHtml(room.inviteCode)}">` : ""}
        ${
          room.hasPassword
            ? `<button type="button" class="games-button ${isJoinBlockedByFullRoom ? "games-button--secondary" : "games-button--primary"}" data-games-join-password-room="${escapeHtml(room.id)}" ${isJoinBlockedByFullRoom ? `data-games-room-full="${escapeHtml(room.id)}"` : ""} ${canAttemptJoin ? "" : "disabled"}>
                ${escapeHtml(gameT("rooms.join"))}
              </button>`
            : `<button type="submit" class="games-button ${isJoinBlockedByFullRoom ? "games-button--secondary" : "games-button--primary"}" ${isJoinBlockedByFullRoom ? `data-games-room-full="${escapeHtml(room.id)}"` : ""} ${canAttemptJoin ? "" : "disabled"}>
                ${escapeHtml(gameT("rooms.join"))}
              </button>`
        }
      </form>
    </article>
  `;
}
