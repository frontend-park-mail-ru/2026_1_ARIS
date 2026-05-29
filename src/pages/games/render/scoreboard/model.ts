import type { GameRoom } from "../../../../api/games";
import { scoreValueAnimationMs } from "../../shared/constants";
import {
  getComputedScoresByProfile,
  getLatestCompletedQuestion,
  getPreviousRoundAnswerTimeByProfile,
  getPreviousRoundScoresByProfile,
  getRankedPlayers,
  getRankedPlayersByScores,
  getRoundPointsByProfile,
  getTotalAnswerTimeByProfile,
} from "../../round/model";
import {
  getRoundPointSequence,
  getRoundResultTimelineStartMs,
  getRoundResultTransitionEndMs,
  getRoundScoreAnimationStartDelayMs,
  getRoundScoreStepDelayMs,
} from "../../round/timeline";
import { isRoundResultRevealVisible } from "../../round/reveal";

const scoreboardSortSettleMs = 650;
const scoreboardScheduleLeadMs = 300;

function getTimestampMs(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function shouldKeepRecentScoreboardAnimation(
  room: GameRoom,
  question: GameRoom["questions"][number],
): boolean {
  if (room.status !== "active" || !room.currentQuestion) return false;
  if (!getTimestampMs(question.completedAt)) return false;
  const transitionEndMs = getRoundResultTransitionEndMs(room, question);
  return Number.isFinite(transitionEndMs) && Date.now() < transitionEndMs;
}

/**
 * Возвращает раунд, который сейчас раскрывается на scoreboard.
 */
function getDisplayedRoundQuestion(room: GameRoom): GameRoom["questions"][number] | null {
  const latestCompleted = getLatestCompletedQuestion(room);
  if (!latestCompleted) return null;
  if (isRoundResultRevealVisible(room)) return latestCompleted;
  return shouldKeepRecentScoreboardAnimation(room, latestCompleted) ? latestCompleted : null;
}

function getScoreboardSortDelayMs(
  scoreStartDelayMs: number,
  scoreStepDelayMs: number,
  count: number,
) {
  if (count <= 0) return 0;
  const lastScoreStartMs = scoreStartDelayMs + Math.max(0, count - 1) * scoreStepDelayMs;
  const delayedSortMs = lastScoreStartMs + scoreboardSortSettleMs;
  const lastScoreEndMs = lastScoreStartMs + scoreValueAnimationMs;
  return Math.max(delayedSortMs, lastScoreEndMs + scoreboardScheduleLeadMs);
}

function getScoreAnimationSchedule(
  room: GameRoom,
  question: GameRoom["questions"][number],
  timelineStartMs: number,
  pointSequenceCount: number,
): { scoreStartDelayMs: number; scoreStepDelayMs: number; sortAtMs: number } {
  const scoreStartDelayMs = getRoundScoreAnimationStartDelayMs(room, question);
  const scoreStepDelayMs = getRoundScoreStepDelayMs();

  if (pointSequenceCount <= 0) {
    return { scoreStartDelayMs: 0, scoreStepDelayMs, sortAtMs: 0 };
  }

  return {
    scoreStartDelayMs,
    scoreStepDelayMs,
    sortAtMs:
      timelineStartMs +
      getScoreboardSortDelayMs(scoreStartDelayMs, scoreStepDelayMs, pointSequenceCount),
  };
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
  const finalAnswerTimeMap = getTotalAnswerTimeByProfile(room);
  const displayAnswerTimeMap = revealQuestion
    ? getPreviousRoundAnswerTimeByProfile(room, revealQuestion)
    : finalAnswerTimeMap;
  const rankedPlayers = revealQuestion
    ? getRankedPlayersByScores(room, displayScoreMap, displayAnswerTimeMap)
    : getRankedPlayers(room);
  const finalRankedPlayers = getRankedPlayersByScores(room, finalScoreMap, finalAnswerTimeMap);
  const finalOrderByProfile = new Map(
    finalRankedPlayers.map((player, index) => [player.profileId, index]),
  );
  const roundPoints = revealQuestion ? getRoundPointsByProfile(room, revealQuestion) : new Map();
  const pointSequence = revealQuestion ? getRoundPointSequence(room, revealQuestion) : [];
  const pointSequenceByProfile = new Map(
    pointSequence.map((entry, index) => [entry.player.profileId, index]),
  );
  const timelineStartMs = revealQuestion ? getRoundResultTimelineStartMs(revealQuestion) : 0;
  const scoreSchedule = revealQuestion
    ? getScoreAnimationSchedule(room, revealQuestion, timelineStartMs, pointSequence.length)
    : {
        scoreStartDelayMs: 0,
        scoreStepDelayMs: getRoundScoreStepDelayMs(),
        sortAtMs: 0,
      };

  return {
    revealQuestion,
    finalScoreMap,
    finalAnswerTimeMap,
    displayScoreMap,
    displayAnswerTimeMap,
    rankedPlayers,
    finalRankedPlayers,
    finalOrderByProfile,
    roundPoints,
    pointSequenceByProfile,
    timelineStartMs,
    scoreStartDelayMs: scoreSchedule.scoreStartDelayMs,
    scoreStepDelayMs: scoreSchedule.scoreStepDelayMs,
    sortAtMs: scoreSchedule.sortAtMs,
  };
}
