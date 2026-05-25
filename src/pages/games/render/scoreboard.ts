import { escapeHtml } from "../../../utils/avatar";
import { getGameScoreboardModel } from "./scoreboard/model";
import { renderGameScoreboardPlayerCard } from "./scoreboard/player-card";
import type { RenderGamePlayersRailOptions, RenderGameScoreboardOptions } from "./scoreboard/types";

export type {
  GameProfileLinkOptions,
  RenderGamePlayersRailOptions,
  RenderGameScoreboardOptions,
} from "./scoreboard/types";

/** Рендерит боковую таблицу игроков и очков во время игры. */
export function renderGameScoreboard(options: RenderGameScoreboardOptions): string {
  const { room } = options;
  const model = getGameScoreboardModel(room);

  return `
    <aside class="games-game-scoreboard" aria-label="Игроки и очки">
      <header class="games-game-scoreboard__header">
        <span>Игроки</span>
      </header>
      <div
        class="games-game-scoreboard__list"
        ${model.revealQuestion ? `data-games-scoreboard-list data-games-scoreboard-sort-at="${model.sortAtMs}" data-games-scoreboard-final-order="${escapeHtml(model.finalRankedPlayers.map((player) => player.profileId).join(","))}"` : ""}
      >
        ${model.rankedPlayers
          .map((player) => renderGameScoreboardPlayerCard(room, player, model, options))
          .join("")}
      </div>
    </aside>
  `;
}

/** Рендерит боковую панель игроков для полноэкранной игровой сцены. */
export function renderGamePlayersRail(options: RenderGamePlayersRailOptions): string {
  return `
    <section class="games-room-players-panel content-card" aria-label="Игроки">
      ${renderGameScoreboard(options)}
      <button type="button" class="games-button games-button--danger games-room-exit-button" data-games-leave-open ${options.loading ? "disabled" : ""}>
        Выйти из игры
      </button>
    </section>
  `;
}
