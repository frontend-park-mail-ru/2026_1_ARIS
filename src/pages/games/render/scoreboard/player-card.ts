import type { GameRoom } from "../../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { formatRoundPointBadge, formatRoundPointValue } from "../../shared/formatters";
import { getPlayerPlaceByScores } from "../../round/model";
import { getGamePlayerLabel, getPlayerFullName } from "../../room/profile/players";
import { gameT } from "../../shared/i18n";
import type { RenderGameScoreboardOptions } from "./types";
import type { getGameScoreboardModel } from "./model";

type GameScoreboardModel = ReturnType<typeof getGameScoreboardModel>;

/**
 * Рендерит компактное имя игрока в боковой таблице без фамилии.
 */
function renderScoreboardPlayerNameContent(player: GameRoom["players"][number]): string {
  const playerLabel = getGamePlayerLabel(player);
  return `
    <span class="games-game-player__name-lines">
      <span class="games-game-player__first-name">${escapeHtml(playerLabel)}</span>
    </span>
  `;
}

/**
 * Рендерит карточку игрока внутри игровой таблицы очков.
 */
export function renderGameScoreboardPlayerCard(
  room: GameRoom,
  player: GameRoom["players"][number],
  model: GameScoreboardModel,
  options: Pick<RenderGameScoreboardOptions, "getPlayerAvatarUrl" | "renderProfileLink">,
): string {
  const displayRankOptions = model.revealQuestion
    ? { excludeQuestionId: model.revealQuestion.id }
    : undefined;
  const place = getPlayerPlaceByScores(room, player, model.displayScoreMap, displayRankOptions);
  const playerLabel = getGamePlayerLabel(player);
  const playerFullName = getPlayerFullName(player);
  const avatarUrl = options.getPlayerAvatarUrl(player);
  const avatarMarkup = renderAvatarMarkup("games-game-player__avatar", playerLabel, avatarUrl, {
    width: 40,
    height: 40,
  });
  const avatarView = player.profileId
    ? options.renderProfileLink({
        profileId: player.profileId,
        className: "games-game-player__avatar-link",
        label: playerFullName,
        content: avatarMarkup,
        avatarUrl,
        ariaLabel: gameT("leaderboard.openProfile", { name: playerFullName }),
      })
    : avatarMarkup;
  const nameView = player.profileId
    ? options.renderProfileLink({
        profileId: player.profileId,
        className: "games-game-player__name",
        label: playerFullName,
        content: renderScoreboardPlayerNameContent(player),
        avatarUrl,
      })
    : `<strong class="games-game-player__name">${renderScoreboardPlayerNameContent(player)}</strong>`;
  const roundPointValue = model.roundPoints.get(player.profileId);
  const displayScore = model.displayScoreMap.get(player.profileId) ?? 0;
  const finalScore = model.finalScoreMap.get(player.profileId) ?? displayScore;
  const pointSequenceIndex = model.pointSequenceByProfile.get(player.profileId);
  const scoreAnimationStartAt =
    pointSequenceIndex === undefined
      ? 0
      : model.timelineStartMs +
        model.scoreStartDelayMs +
        pointSequenceIndex * model.scoreStepDelayMs;
  const finalPlace = getPlayerPlaceByScores(room, player, model.finalScoreMap);

  return `
    <article class="games-game-player${player.isMe ? " games-game-player--me" : ""}${place === 1 ? " games-game-player--leader" : ""}${room.status === "active" && player.hasAnswered ? " games-game-player--answered" : ""}" data-games-player-card="${escapeHtml(player.profileId)}" data-games-scoreboard-card="${escapeHtml(player.profileId)}" data-games-player-final-order="${model.finalOrderByProfile.get(player.profileId) ?? 0}" data-games-player-final-place="${finalPlace}" data-games-player-answered="${player.hasAnswered ? "true" : "false"}">
      <span class="games-game-player__place">#${place}</span>
      ${avatarView}
      <span class="games-game-player__info">
        ${nameView}
      </span>
      <span class="games-game-player__score${scoreAnimationStartAt > 0 ? " games-game-player__score--pending-round-points" : ""}"${scoreAnimationStartAt > 0 ? ` data-games-score-shell data-games-score-show-at="${scoreAnimationStartAt}"` : ""}>
        <strong${
          scoreAnimationStartAt > 0
            ? ` data-games-score-animate data-games-score-from="${displayScore}" data-games-score-to="${finalScore}" data-games-score-start-at="${scoreAnimationStartAt}"`
            : ""
        }>${escapeHtml(formatRoundPointValue(displayScore))}</strong>
        ${
          roundPointValue === undefined || roundPointValue <= 0 || scoreAnimationStartAt <= 0
            ? ""
            : `<em class="games-game-player__round-points" data-games-round-points-badge data-games-round-points-start-at="${scoreAnimationStartAt}">${escapeHtml(formatRoundPointBadge(roundPointValue))}</em>`
        }
      </span>
    </article>
  `;
}
