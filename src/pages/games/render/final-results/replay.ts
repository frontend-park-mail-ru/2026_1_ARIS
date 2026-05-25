import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { getPlayerFullName } from "../../room/profile/players";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит действие повторной игры после финальных итогов. */
export function renderReplayAction(options: RenderFinalGameStageOptions): string {
  const { room, currentPlayer, loading, getPlayerAvatarUrl } = options;
  if (!currentPlayer || room.players.length < 2) return "";

  const readyCount = room.players.filter((player) => player.isReady).length;
  const totalCount = room.players.length;
  const isWaiting = currentPlayer.isReady;
  const nextReadyValue = isWaiting ? "false" : "true";
  const allReady = totalCount > 0 && readyCount >= totalCount;
  const buttonText = isWaiting ? "Ждем других игроков. Отменить" : "Сыграть еще раз";
  const statusText = allReady
    ? "Запускаем повтор..."
    : isWaiting
      ? `Ждем игроков: ${readyCount} из ${totalCount}`
      : `Готовы к повтору: ${readyCount} из ${totalCount}`;

  return `
    <section class="games-replay-action${isWaiting ? " games-replay-action--waiting" : ""}" aria-label="Повторная игра">
      <div class="games-replay-action__copy">
        <strong>Сыграть еще раз</strong>
        <span>${escapeHtml(statusText)}</span>
      </div>
      <div class="games-replay-action__players" aria-label="Готовность игроков">
        ${room.players
          .map((player) => {
            const playerLabel = getPlayerFullName(player);
            const avatarMarkup = renderAvatarMarkup(
              "games-replay-player__avatar",
              playerLabel,
              getPlayerAvatarUrl(player),
              {
                width: 24,
                height: 24,
              },
            );
            return `
              <span class="games-replay-player${player.isReady ? " games-replay-player--ready" : " games-replay-player--waiting"}">
                ${avatarMarkup}
                <span class="games-replay-player__name">${escapeHtml(playerLabel)}</span>
                <span class="games-replay-player__status">${player.isReady ? "готов" : "ждет"}</span>
              </span>
            `;
          })
          .join("")}
      </div>
      <button type="button" class="games-button games-button--primary games-replay-action__button" data-games-replay-toggle="${nextReadyValue}" ${loading ? "disabled" : ""}>
        ${escapeHtml(buttonText)}
      </button>
    </section>
  `;
}
