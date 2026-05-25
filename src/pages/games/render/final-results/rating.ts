import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { formatRatingDelta, formatSeasonTitle } from "../../shared/formatters";
import { getPlayerFullNameByProfile } from "../../room/profile/players";
import type { RenderFinalGameStageOptions } from "./types";

/** Возвращает CSS-класс изменения рейтинга. */
export function getRatingDeltaClass(delta: number): string {
  if (delta > 0) return "games-rating-delta games-rating-delta--up";
  if (delta < 0) return "games-rating-delta games-rating-delta--down";
  return "games-rating-delta";
}

/** Рендерит изменения рейтинга после рейтинговой игры. */
export function renderRatingChanges(options: RenderFinalGameStageOptions): string {
  const { room, getPlayerAvatarUrl, renderProfileLink } = options;
  if (!room.isRanked) return "";
  if (!room.ratingChanges.length) {
    return `<p class="games-stage-card__hint">Рейтинг пересчитается после сохранения результата.</p>`;
  }
  const seasonTitle = formatSeasonTitle(room.ratingChanges[0]?.seasonTitle || "Текущий сезон");

  return `
    <section class="games-rating-summary" aria-label="Изменение рейтинга">
      <header class="games-rating-summary__header">
        <strong>Изменения в рейтинге</strong>
        <span>${escapeHtml(seasonTitle)}</span>
      </header>
      <div class="games-rating-summary__list">
        ${room.ratingChanges
          .map((change) => {
            const player = room.players.find((item) => item.profileId === change.profileId) ?? null;
            const playerLabel = getPlayerFullNameByProfile(room, change.profileId);
            const avatarUrl = player ? getPlayerAvatarUrl(player) : "";
            const avatarMarkup = renderAvatarMarkup(
              "games-rating-change__avatar",
              playerLabel,
              avatarUrl,
              {
                width: 28,
                height: 28,
              },
            );
            const deltaClass = getRatingDeltaClass(change.ratingDelta);
            return `
              <article class="games-rating-change">
                ${renderProfileLink({
                  profileId: change.profileId,
                  className: "games-rating-change__avatar-link",
                  label: playerLabel,
                  content: avatarMarkup,
                  avatarUrl,
                  ariaLabel: `Открыть профиль ${playerLabel}`,
                })}
                ${renderProfileLink({
                  profileId: change.profileId,
                  className: "games-rating-change__name games-player-name-link",
                  label: playerLabel,
                  content: escapeHtml(playerLabel),
                  avatarUrl,
                })}
                <strong>${change.beforeRating} -> ${change.afterRating}</strong>
                <em class="${deltaClass}">${escapeHtml(formatRatingDelta(change.ratingDelta))}</em>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}
