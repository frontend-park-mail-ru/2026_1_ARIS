import type { GameRoom } from "../../../../api/games";
import { scoreboardSortAnimationMs, scoreValueAnimationMs } from "../../shared/constants";
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
  getRoundScoreboardSortDelayMs,
  getRoundScoreStepDelayMs,
} from "../../round/timeline";
import { isRoundResultRevealVisible } from "../../round/reveal";

const scoreboardScheduleLeadMs = 80;
const scoreboardMinStartDelayMs = 80;
const scoreboardMinStepDelayMs = 0;
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

function getScoreAnimationSchedule(
  room: GameRoom,
  question: GameRoom["questions"][number],
  timelineStartMs: number,
  pointSequenceCount: number,
): { scoreStartDelayMs: number; scoreStepDelayMs: number; sortAtMs: number } {
  const defaultStartDelayMs = getRoundScoreAnimationStartDelayMs(room, question);
  const defaultStepDelayMs = getRoundScoreStepDelayMs(pointSequenceCount);
  const defaultSortDelayMs = getRoundScoreboardSortDelayMs(room, question);

  if (pointSequenceCount <= 0) {
    return { scoreStartDelayMs: 0, scoreStepDelayMs: defaultStepDelayMs, sortAtMs: 0 };
  }

  const nextQuestionAtMs = getTimestampMs(room.nextQuestionAt);
  const availableSortDelayMs =
    nextQuestionAtMs - timelineStartMs - scoreboardScheduleLeadMs - scoreboardSortAnimationMs;
  if (
    !nextQuestionAtMs ||
    nextQuestionAtMs <= timelineStartMs ||
    availableSortDelayMs >= defaultSortDelayMs
  ) {
    return {
      scoreStartDelayMs: defaultStartDelayMs,
      scoreStepDelayMs: defaultStepDelayMs,
      sortAtMs: timelineStartMs + defaultSortDelayMs,
    };
  }

  const availableMs = Math.max(0, availableSortDelayMs);
  const stepBudgetMs =
    pointSequenceCount <= 1
      ? defaultStepDelayMs
      : Math.floor(
          (availableMs -
            scoreboardMinStartDelayMs -
            scoreValueAnimationMs -
            scoreboardScheduleLeadMs) /
            (pointSequenceCount - 1),
        );
  const scoreStepDelayMs =
    pointSequenceCount <= 1
      ? defaultStepDelayMs
      : Math.max(scoreboardMinStepDelayMs, Math.min(defaultStepDelayMs, stepBudgetMs));
  const latestStartDelayMs =
    availableMs -
    Math.max(0, pointSequenceCount - 1) * scoreStepDelayMs -
    scoreValueAnimationMs -
    scoreboardScheduleLeadMs;
  const scoreStartDelayMs = Math.max(
    scoreboardMinStartDelayMs,
    Math.min(defaultStartDelayMs, latestStartDelayMs),
  );

  return {
    scoreStartDelayMs,
    scoreStepDelayMs,
    sortAtMs: timelineStartMs + Math.min(defaultSortDelayMs, availableMs),
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
