import type { GameRoom } from "../../../../api/games";
import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { formatRoundPointBadge, formatRoundPointValue } from "../../shared/formatters";
import { getPlayerPlaceByScores } from "../../round/model";
import { getGamePlayerLabel, getPlayerFullName } from "../../room/profile/players";
import type { RenderGameScoreboardOptions } from "./types";
import type { getGameScoreboardModel } from "./model";

type GameScoreboardModel = ReturnType<typeof getGameScoreboardModel>;

/**
 * Рендерит карточку игрока внутри игровой таблицы очков.
 */
export function renderGameScoreboardPlayerCard(
  room: GameRoom,
  player: GameRoom["players"][number],
  model: GameScoreboardModel,
  options: Pick<RenderGameScoreboardOptions, "getPlayerAvatarUrl" | "renderProfileLink">,
): string {
  const place = getPlayerPlaceByScores(room, player, model.displayScoreMap);
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
        ariaLabel: `Открыть профиль ${playerFullName}`,
      })
    : avatarMarkup;
  const nameView = player.profileId
    ? options.renderProfileLink({
        profileId: player.profileId,
        className: "games-game-player__name",
        label: playerFullName,
        content: escapeHtml(playerLabel),
        avatarUrl,
      })
    : `<strong class="games-game-player__name">${escapeHtml(playerLabel)}</strong>`;
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
      <span class="games-game-player__score">
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
