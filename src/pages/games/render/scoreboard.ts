import { escapeHtml } from "../../../utils/avatar";
import { shouldShowFinalRoundResultBeforeSummary } from "../round/reveal";
import { getGameScoreboardModel } from "./scoreboard/model";
import { renderGameScoreboardPlayerCard } from "./scoreboard/player-card";
import type { RenderGamePlayersRailOptions, RenderGameScoreboardOptions } from "./scoreboard/types";
import { gameT } from "../shared/i18n";

export type {
  GameProfileLinkOptions,
  RenderGamePlayersRailOptions,
  RenderGameScoreboardOptions,
} from "./scoreboard/types";

function shouldHideScoreboardBeforeFinalResults(
  room: RenderGameScoreboardOptions["room"],
): boolean {
  if (room.questionCount <= 0) return false;
  if (room.status === "finished") return shouldShowFinalRoundResultBeforeSummary(room);

  const activeQuestionPosition = room.currentQuestion?.position ?? 0;
  const currentPosition = Math.max(activeQuestionPosition, room.currentQuestionIndex);
  return currentPosition >= room.questionCount;
}

function renderScoreboardHiddenNotice(): string {
  return `
    <div class="games-scoreboard-hidden" role="status">
      ${escapeHtml(gameT("gameplay.scoreboardHidden"))}
    </div>
  `;
}

/** Рендерит боковую таблицу игроков и очков во время игры. */
export function renderGameScoreboard(options: RenderGameScoreboardOptions): string {
  const { room } = options;
  const model = getGameScoreboardModel(room);

  return `
    <aside class="games-game-scoreboard" aria-label="${escapeHtml(gameT("gameplay.playersAria"))}">
      <header class="games-game-scoreboard__header">
        <span>${escapeHtml(gameT("gameplay.playersTitle"))}</span>
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
  const shouldHideScoreboard = shouldHideScoreboardBeforeFinalResults(options.room);

  return `
    <section class="games-room-players-panel${options.room.isPublicLobby ? " games-room-players-panel--public" : ""} content-card" aria-label="${escapeHtml(gameT("gameplay.playersTitle"))}">
      ${
        shouldHideScoreboard
          ? renderScoreboardHiddenNotice()
          : `
            ${renderGameScoreboard(options)}
            <button type="button" class="games-button games-button--danger games-room-exit-button" data-games-leave-open ${options.loading ? "disabled" : ""}>
              ${escapeHtml(gameT("gameplay.leaveGame"))}
            </button>
          `
      }
    </section>
  `;
}
