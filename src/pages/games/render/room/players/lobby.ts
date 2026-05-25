import type { GameRoom } from "../../../../../api/games";
import { getRoomAuthor } from "../../../room/selectors";
import type { PlayerAvatarResolver } from "./types";
import { renderPlayerProfileLink } from "./profile-link";

/**
 * Рендерит подпись администратора в лобби комнаты.
 */
export function renderLobbyCreator(
  room: GameRoom,
  getPlayerAvatarUrl: PlayerAvatarResolver,
): string {
  const creator = getRoomAuthor(room);
  if (!creator) return "";

  return `
    <div class="games-lobby-creator">
      <span class="games-lobby-creator__label">Администратор:</span>
      ${renderPlayerProfileLink(creator, getPlayerAvatarUrl)}
    </div>
  `;
}
