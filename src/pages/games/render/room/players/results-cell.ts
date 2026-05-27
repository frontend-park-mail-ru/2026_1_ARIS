import { escapeHtml, renderAvatarMarkup } from "../../../../../utils/avatar";
import { getPlayerFullName } from "../../../room/profile/players";
import { gameT } from "../../../shared/i18n";
import { renderProtectedGameProfileLink } from "./profile-link";
import type { RenderResultsPlayerCellOptions } from "./types";

/**
 * Рендерит игрока в таблице результатов вопроса.
 */
export function renderResultsPlayerCell(options: RenderResultsPlayerCellOptions): string {
  const { player, playerLabel, getPlayerAvatarUrl } = options;
  const playerFullName = getPlayerFullName(player);
  const avatarUrl = getPlayerAvatarUrl(player);
  const avatarMarkup = renderAvatarMarkup("games-results-table__avatar", playerLabel, avatarUrl, {
    width: 28,
    height: 28,
  });

  return `
    <span class="games-results-table__player">
      ${
        player.profileId
          ? renderProtectedGameProfileLink({
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
          ? renderProtectedGameProfileLink({
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
