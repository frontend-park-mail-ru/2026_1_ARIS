import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { getComputedWinnerProfileId } from "../../round/model";
import { getPlayerFullNameByProfile } from "../../room/profile/players";
import { gameT } from "../../shared/i18n";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит hero-блок победителя в финальных итогах. */
export function renderFinalWinnerHero(
  options: RenderFinalGameStageOptions,
  completedCount: number,
): string {
  const { room, getPlayerAvatarUrl, renderProfileLink } = options;
  const winnerProfileId = getComputedWinnerProfileId(room);
  const summary = completedCount
    ? gameT("results.playedQuestions", { completed: completedCount, total: room.questionCount })
    : gameT("results.gameFinished");

  if (!winnerProfileId) {
    return `
      <div class="games-final-hero">
        <h2 class="games-stage-card__title">${escapeHtml(gameT("results.winnerTitle"))}</h2>
        <div class="games-final-winner-card games-final-winner-card--draw">${escapeHtml(gameT("results.draw"))}</div>
        <p>${escapeHtml(summary)}</p>
      </div>
    `;
  }

  const winner = room.players.find((player) => player.profileId === winnerProfileId) ?? null;
  const winnerName = getPlayerFullNameByProfile(room, winnerProfileId);
  const avatarUrl = winner ? getPlayerAvatarUrl(winner) : "";
  const avatarMarkup = renderAvatarMarkup(
    "games-final-winner-card__avatar",
    winnerName,
    avatarUrl,
    {
      width: 52,
      height: 52,
    },
  );

  return `
    <div class="games-final-hero">
      <h2 class="games-stage-card__title">${escapeHtml(gameT("results.winnerTitle"))}</h2>
      ${renderProfileLink({
        profileId: winnerProfileId,
        className: "games-final-winner-card games-player-name-link",
        label: winnerName,
        content: `${avatarMarkup}<strong>${escapeHtml(winnerName)}</strong>`,
        avatarUrl,
        ariaLabel: gameT("leaderboard.openProfile", { name: winnerName }),
      })}
      <p>${escapeHtml(summary)}</p>
    </div>
  `;
}
