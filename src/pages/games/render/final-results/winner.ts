import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { getComputedWinnerProfileId } from "../../round/model";
import { getPlayerFullNameByProfile } from "../../room/profile/players";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит hero-блок победителя в финальных итогах. */
export function renderFinalWinnerHero(
  options: RenderFinalGameStageOptions,
  completedCount: number,
): string {
  const { room, getPlayerAvatarUrl, renderProfileLink } = options;
  const winnerProfileId = getComputedWinnerProfileId(room);
  const summary = completedCount
    ? `Сыграно вопросов: ${completedCount} из ${room.questionCount}`
    : "Игра завершена";

  if (!winnerProfileId) {
    return `
      <div class="games-final-hero">
        <h2 class="games-stage-card__title">Победитель:</h2>
        <div class="games-final-winner-card games-final-winner-card--draw">Ничья</div>
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
      <h2 class="games-stage-card__title">Победитель:</h2>
      ${renderProfileLink({
        profileId: winnerProfileId,
        className: "games-final-winner-card games-player-name-link",
        label: winnerName,
        content: `${avatarMarkup}<strong>${escapeHtml(winnerName)}</strong>`,
        avatarUrl,
        ariaLabel: `Открыть профиль ${winnerName}`,
      })}
      <p>${escapeHtml(summary)}</p>
    </div>
  `;
}
