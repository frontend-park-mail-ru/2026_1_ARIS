import type { GameRoom } from "../../../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../../../utils/avatar";
import { formatRoomModeLabel } from "../../../room/profile/system-messages";
import { getRoomAuthor } from "../../../room/selectors";
import type { PlayerAvatarResolver } from "./types";
import { getRoomAuthorHref } from "./profile-link";

/**
 * Рендерит переключатель типа комнаты.
 */
export function renderRoomRankedToggle(room: GameRoom, canManageRanked: boolean): string {
  const lockedHint = "Только администратор может менять тип игры";
  const lockedClass = canManageRanked ? "" : " games-room-ranked-segmented--locked";
  const tooltipClass = canManageRanked ? "" : " games-tooltip-anchor--with-tooltip";

  return `
    <section class="games-room-detail-card games-room-detail-card--ranked" aria-label="Тип игры">
      <div class="games-room-detail-card__content">
        <span class="games-room-detail-card__label">Тип игры</span>
      </div>
      <div class="games-tooltip-anchor games-tooltip-anchor--ranked-toggle${tooltipClass}">
        <fieldset class="games-ready-segmented games-ready-segmented--compact games-rating-segmented games-room-ranked-segmented${lockedClass}" aria-label="Тип игры">
          <label class="games-ready-segmented__option" data-games-room-ranked-toggle="false">
            <input
              class="games-ready-segmented__input"
              type="radio"
              name="roomIsRanked"
              value="false"
              ${room.isRanked ? "" : "checked"}
              ${canManageRanked ? "" : "disabled"}
              aria-label="Обычная"
            >
            <span class="games-ready-segmented__text">Обычная</span>
          </label>
          <label class="games-ready-segmented__option" data-games-room-ranked-toggle="true">
            <input
              class="games-ready-segmented__input"
              type="radio"
              name="roomIsRanked"
              value="true"
              ${room.isRanked ? "checked" : ""}
              ${canManageRanked ? "" : "disabled"}
              aria-label="Рейтинговая"
            >
            <span class="games-ready-segmented__text">Рейтинговая</span>
          </label>
        </fieldset>
        ${
          canManageRanked
            ? ""
            : `
              <div class="games-tooltip-anchor__popup" role="tooltip">
                <span class="games-tooltip-anchor__line">${escapeHtml(lockedHint)}</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

/**
 * Возвращает отображаемое имя администратора комнаты.
 */
export function getRoomAuthorName(room: GameRoom): string {
  const author = getRoomAuthor(room);
  return author?.name || "Администратор";
}

/**
 * Рендерит ссылку на администратора комнаты.
 */
export function renderRoomAuthor(room: GameRoom, getPlayerAvatarUrl: PlayerAvatarResolver): string {
  const author = getRoomAuthor(room);
  const name = getRoomAuthorName(room);
  const profileId = author?.profileId || room.createdByProfileId;

  return `
    <a href="${getRoomAuthorHref(profileId)}" class="games-room-author" data-link>
      ${renderAvatarMarkup(
        "games-room-author__avatar",
        name,
        author ? getPlayerAvatarUrl(author) : "",
        {
          width: 36,
          height: 36,
        },
      )}
      <span>${escapeHtml(name)}</span>
    </a>
  `;
}

/**
 * Рендерит бейдж типа комнаты.
 */
export function renderRankedBadge(room: GameRoom): string {
  return `<span class="${room.isRanked ? "games-ranked-badge games-ranked-badge--ranked" : "games-ranked-badge"}">${formatRoomModeLabel(room.isRanked)}</span>`;
}
