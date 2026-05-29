import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { formatDurationMs } from "../../round/model";
import { formatRatingDelta, formatGamePoints } from "../../shared/formatters";
import {
  getComputedScoresByProfile,
  getPlayerPlace,
  getPlayerTotalResponseTimeMs,
  getRankedPlayers,
} from "../../round/model";
import { getPlayerFullName } from "../../room/profile/players";
import { gameT } from "../../shared/i18n";
import { getRatingDeltaClass } from "./rating";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит таблицу мест игроков в финальных итогах. */
export function renderFinalStandings(options: RenderFinalGameStageOptions): string {
  const { room, getPlayerAvatarUrl, renderProfileLink } = options;
  const rankedPlayers = getRankedPlayers(room);
  const scoreMap = getComputedScoresByProfile(room);
  const ratingByProfile = new Map(room.ratingChanges.map((change) => [change.profileId, change]));

  return `
    <div class="games-final-standings" aria-label="${escapeHtml(gameT("results.standingsAria"))}">
      ${rankedPlayers
        .map((player, index) => {
          const playerLabel = getPlayerFullName(player);
          const avatarUrl = getPlayerAvatarUrl(player);
          const avatarMarkup = renderAvatarMarkup(
            "games-final-place__avatar",
            playerLabel,
            avatarUrl,
            {
              width: 36,
              height: 36,
            },
          );
          const ratingDelta = ratingByProfile.get(player.profileId)?.ratingDelta ?? 0;
          const totalTime = getPlayerTotalResponseTimeMs(room, player.profileId);
          return `
            <article class="games-final-place${player.isMe ? " games-final-place--me" : ""}${index === 0 ? " games-final-place--winner" : ""}" style="--games-result-index: ${index}">
              <strong>${getPlayerPlace(room, player)}</strong>
              ${
                player.profileId
                  ? renderProfileLink({
                      profileId: player.profileId,
                      className: "games-final-place__avatar-link",
                      label: playerLabel,
                      content: avatarMarkup,
                      avatarUrl,
                      ariaLabel: gameT("leaderboard.openProfile", { name: playerLabel }),
                    })
                  : avatarMarkup
              }
              ${
                player.profileId
                  ? renderProfileLink({
                      profileId: player.profileId,
                      className: "games-final-place__name games-player-name-link",
                      label: playerLabel,
                      content: escapeHtml(playerLabel),
                      avatarUrl,
                    })
                  : `<span class="games-final-place__name">${escapeHtml(playerLabel)}</span>`
              }
              <span class="games-final-place__stats">
                <em><span>${escapeHtml(gameT("results.standingsPoints"))}</span>${escapeHtml(formatGamePoints(scoreMap.get(player.profileId) ?? 0))}</em>
                <time><span>${escapeHtml(gameT("results.standingsTime"))}</span>${escapeHtml(formatDurationMs(totalTime))}</time>
              </span>
              ${
                room.isRanked && ratingByProfile.has(player.profileId)
                  ? `<small class="${getRatingDeltaClass(ratingDelta)}">
                      ${escapeHtml(formatRatingDelta(ratingDelta))}
                    </small>`
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}
