import { escapeHtml } from "../../../../../utils/avatar";
import { getRoomMaxPlayers } from "../../../room/selectors";
import { gameT } from "../../../shared/i18n";
import type { RenderPlayerListOptions } from "./types";
import { renderPlayerProfileLink } from "./profile-link";

/**
 * Рендерит список игроков в комнате ожидания.
 */
export function renderPlayerList(options: RenderPlayerListOptions): string {
  const { room, playerMenuProfileId, isCurrentRoomCreator, getPlayerAvatarUrl } = options;
  const emptySlots = Math.max(0, getRoomMaxPlayers(room) - room.players.length);
  const isCreator = isCurrentRoomCreator(room);

  return `
    <div class="games-scoreboard" aria-label="${escapeHtml(gameT("room.playersInRoomAria"))}">
      ${room.players
        .map(
          (player) => `
            <article class="games-player${player.isMe ? " games-player--me" : ""}${player.hasAnswered ? " games-player--answered" : ""}${room.status === "waiting" ? (player.isReady ? " games-player--ready" : " games-player--not-ready") : ""}">
              <div class="games-player__body">
                ${renderPlayerProfileLink(player, getPlayerAvatarUrl)}
              </div>
              ${
                isCreator &&
                player.profileId !== room.createdByProfileId &&
                room.status === "waiting"
                  ? `
                    <div class="games-player-menu">
                      <button
                        type="button"
                        class="games-menu-toggle games-player-menu__toggle"
                        data-games-player-menu-toggle="${escapeHtml(player.profileId)}"
                        aria-label="${escapeHtml(gameT("room.playerActionsAria"))}"
                        aria-expanded="${playerMenuProfileId === player.profileId ? "true" : "false"}"
                      >
                        <span></span><span></span><span></span>
                      </button>
                    </div>
                  `
                  : ""
              }
            </article>
          `,
        )
        .join("")}
      ${
        emptySlots > 0
          ? `
            <div class="games-player-empty-summary">
              ${escapeHtml(gameT("room.emptySlots", { count: emptySlots }))}
            </div>
          `
          : ""
      }
    </div>
  `;
}
