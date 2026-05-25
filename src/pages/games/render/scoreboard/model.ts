import type { GameRoom } from "../../../../api/games";
import {
  getComputedScoresByProfile,
  getLatestCompletedQuestion,
  getPreviousRoundScoresByProfile,
  getRankedPlayers,
  getRankedPlayersByScores,
  getRoundPointsByProfile,
} from "../../round/model";
import {
  getRoundPointSequence,
  getRoundResultTimelineStartMs,
  getRoundScoreAnimationStartDelayMs,
  getRoundScoreboardSortDelayMs,
  getRoundScoreStepDelayMs,
} from "../../round/timeline";
import { isRoundResultRevealVisible } from "../../round/reveal";

/**
 * Возвращает раунд, который сейчас раскрывается на scoreboard.
 */
function getDisplayedRoundQuestion(room: GameRoom): GameRoom["questions"][number] | null {
  const latestCompleted = getLatestCompletedQuestion(room);
  return latestCompleted && isRoundResultRevealVisible(room) ? latestCompleted : null;
}

/**
 * Собирает вычисленную модель scoreboard для рендера игроков и анимаций очков.
 */
export function getGameScoreboardModel(room: GameRoom) {
  const revealQuestion = getDisplayedRoundQuestion(room);
  const finalScoreMap = getComputedScoresByProfile(room);
  const displayScoreMap = revealQuestion
    ? getPreviousRoundScoresByProfile(room, revealQuestion)
    : finalScoreMap;
  const rankedPlayers = revealQuestion
    ? getRankedPlayersByScores(room, displayScoreMap)
    : getRankedPlayers(room);
  const finalRankedPlayers = getRankedPlayersByScores(room, finalScoreMap);
  const finalOrderByProfile = new Map(
    finalRankedPlayers.map((player, index) => [player.profileId, index]),
  );
  const roundPoints = revealQuestion ? getRoundPointsByProfile(room, revealQuestion) : new Map();
  const pointSequence = revealQuestion ? getRoundPointSequence(room, revealQuestion) : [];
  const pointSequenceByProfile = new Map(
    pointSequence.map((entry, index) => [entry.player.profileId, index]),
  );
  const timelineStartMs = revealQuestion ? getRoundResultTimelineStartMs(revealQuestion) : 0;
  const scoreStartDelayMs = revealQuestion
    ? getRoundScoreAnimationStartDelayMs(room, revealQuestion)
    : 0;
  const scoreStepDelayMs = getRoundScoreStepDelayMs();
  const sortAtMs = revealQuestion
    ? timelineStartMs + getRoundScoreboardSortDelayMs(room, revealQuestion)
    : 0;

  return {
    revealQuestion,
    finalScoreMap,
    displayScoreMap,
    rankedPlayers,
    finalRankedPlayers,
    finalOrderByProfile,
    roundPoints,
    pointSequenceByProfile,
    timelineStartMs,
    scoreStartDelayMs,
    scoreStepDelayMs,
    sortAtMs,
  };
}
