import type { GameRoom } from "../../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { getPlayerFullName } from "../../room/profile/players";
import { gameT } from "../../shared/i18n";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит ячейку игрока в таблицах финальных результатов. */
export function renderResultsPlayerCell(
  player: GameRoom["players"][number],
  playerLabel: string,
  options: Pick<RenderFinalGameStageOptions, "getPlayerAvatarUrl" | "renderProfileLink">,
): string {
  const playerFullName = getPlayerFullName(player);
  const avatarUrl = options.getPlayerAvatarUrl(player);
  const avatarMarkup = renderAvatarMarkup("games-results-table__avatar", playerLabel, avatarUrl, {
    width: 28,
    height: 28,
  });

  return `
    <span class="games-results-table__player">
      ${
        player.profileId
          ? options.renderProfileLink({
              profileId: player.profileId,
              className: "games-results-table__avatar-link",
              label: playerFullName,
              content: avatarMarkup,
              avatarUrl,
              ariaLabel: gameT("leaderboard.openProfile", { name: playerFullName }),
            })
          : avatarMarkup
      }
      ${
        player.profileId
          ? options.renderProfileLink({
              profileId: player.profileId,
              className: "games-results-table__player-link",
              label: playerFullName,
              content: escapeHtml(playerLabel),
              avatarUrl,
            })
          : `<span class="games-results-table__player-text">${escapeHtml(playerLabel)}</span>`
      }
    </span>
  `;
}
