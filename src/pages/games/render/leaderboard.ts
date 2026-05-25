import type { GameLeaderboard, GameRoom } from "../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../utils/avatar";
import { formatSeasonTitle } from "../shared/formatters";
import { gameT } from "../shared/i18n";

type LeaderboardPlayer = GameLeaderboard["entries"][number]["player"];

type LeaderboardProfileAdapter = {
  getPlayerFullName: (player: LeaderboardPlayer) => string;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  getProfileHref: (profileId: string) => string;
};

export type RenderLeaderboardPanelOptions = LeaderboardProfileAdapter & {
  board: GameLeaderboard | null;
  loading: boolean;
  error: string;
};

/** Рендерит строку игрока в таблице рейтинга. */
function renderLeaderboardEntry(
  entry: GameLeaderboard["entries"][number],
  adapter: LeaderboardProfileAdapter,
): string {
  const playerLabel = adapter.getPlayerFullName(entry.player);
  const profileHref = adapter.getProfileHref(entry.player.profileId);
  const avatarMarkup = renderAvatarMarkup(
    "games-leaderboard-row__avatar",
    playerLabel,
    adapter.getPlayerAvatarUrl(entry.player),
    {
      width: 38,
      height: 38,
    },
  );

  return `
    <article class="games-leaderboard-row${entry.player.isMe ? " games-leaderboard-row--me" : ""}">
      <strong class="games-leaderboard-row__rank">${entry.rank}</strong>
      ${
        entry.player.profileId
          ? `<a href="${profileHref}" class="games-leaderboard-row__avatar-link" data-link aria-label="${escapeHtml(gameT("leaderboard.openProfile", { name: playerLabel }))}">${avatarMarkup}</a>`
          : avatarMarkup
      }
      <span class="games-leaderboard-row__player">
        ${
          entry.player.profileId
            ? `<a href="${profileHref}" class="games-leaderboard-row__name games-player-name-link" data-link>${escapeHtml(playerLabel)}</a>`
            : `<strong>${escapeHtml(playerLabel)}</strong>`
        }
        <small>${escapeHtml(gameT("leaderboard.stats", { games: entry.gamesPlayed, wins: entry.wins }))}</small>
      </span>
      <span class="games-leaderboard-row__rating">${entry.rating}</span>
    </article>
  `;
}

/** Рендерит панель рейтинга игроков для общего лобби игры. */
export function renderLeaderboardPanel(options: RenderLeaderboardPanelOptions): string {
  const { board, loading, error } = options;

  if (loading && !board) {
    return `
      <div class="games-lobby-subview">
        <p class="games-empty">${escapeHtml(gameT("leaderboard.loading"))}</p>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="games-lobby-subview">
        <p class="games-message games-message--error">${escapeHtml(error)}</p>
        <button type="button" class="games-button games-button--secondary" data-games-refresh-leaderboard>
          ${escapeHtml(gameT("leaderboard.retry"))}
        </button>
      </div>
    `;
  }

  const entries = board?.entries ?? [];
  return `
    <div class="games-lobby-subview games-leaderboard">
      <header class="games-leaderboard__header">
        <div>
          <div class="games-section-title-row">
            <h2 class="games-section-title">${escapeHtml(gameT("leaderboard.title"))}</h2>
            <span class="games-section-title-hint">
              <button
                type="button"
                class="games-catalog-card__hint-button"
                data-games-catalog-hint
                aria-controls="games-leaderboard-rules-hint"
                aria-label="${escapeHtml(gameT("leaderboard.showHint"))}"
                aria-expanded="false"
              >
                ?
              </button>
              <span id="games-leaderboard-rules-hint" class="games-field-popover" popover="manual" hidden>
                ${escapeHtml(gameT("leaderboard.hint"))}
              </span>
            </span>
          </div>
          <p class="games-panel__subtitle">${escapeHtml(formatSeasonTitle(board?.season.title ?? gameT("leaderboard.seasonFallback")))}</p>
        </div>
        <button type="button" class="games-button games-button--ghost" data-games-refresh-leaderboard ${loading ? "disabled" : ""}>
          ${escapeHtml(gameT("leaderboard.refresh"))}
        </button>
      </header>
      ${
        entries.length
          ? `
            <div class="games-leaderboard__list">
              ${entries.map((entry) => renderLeaderboardEntry(entry, options)).join("")}
            </div>
          `
          : `
            <div class="games-empty games-leaderboard__empty">
              <p>${escapeHtml(gameT("leaderboard.emptyDescription"))}</p>
              <p>${escapeHtml(gameT("leaderboard.empty"))}</p>
            </div>
          `
      }
    </div>
  `;
}
