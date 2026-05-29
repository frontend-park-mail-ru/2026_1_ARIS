import type { GameRoom } from "../../../api/games";
import {
  roundResultCorrectCardDelayMs,
  roundResultPlayerRevealEndMs,
  roundResultPlayerRevealStartMs,
  roundResultScoreAnimationStartMs,
  roundResultScoreboardLeadMs,
  roundResultScoreboardSortMs,
  roundResultTimesRevealDelayMs,
  roundResultTransitionMs,
  scoreValueAnimationMs,
} from "../shared/constants";
import { gameT } from "../shared/i18n";
import {
  getRoundAnswerShowcaseItems,
  getRoundPointsByProfile,
  getRoundResultPresentationRows,
} from "./model";

/** Возвращает короткое имя игрока для стабильной сортировки анимаций. */
function getRoundTimelinePlayerLabel(player: GameRoom["players"][number]): string {
  const firstName = player.firstName?.trim();
  if (firstName) return firstName;
  const fullName = player.name.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;
  return player.username || gameT("common.playerFallback");
}

/** Возвращает задержку раскрытия карточки ответа. */
export function getRoundResultCardDelayMs(
  revealIndex: number,
  maxRevealIndex = revealIndex,
): number {
  if (revealIndex <= 0) return roundResultCorrectCardDelayMs;

  const safeMaxRevealIndex = Math.max(1, maxRevealIndex);
  if (safeMaxRevealIndex <= 1) return roundResultPlayerRevealStartMs;

  const revealProgress = (revealIndex - 1) / (safeMaxRevealIndex - 1);
  const revealWindowMs = roundResultPlayerRevealEndMs - roundResultPlayerRevealStartMs;
  return Math.round(roundResultPlayerRevealStartMs + revealWindowMs * revealProgress);
}

/** Возвращает максимальный индекс раскрытия ответов раунда. */
export function getRoundResultMaxRevealIndex(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  const rows = getRoundResultPresentationRows(room, question);
  const items = getRoundAnswerShowcaseItems(rows, question);
  const maxRevealIndex = Math.max(0, ...items.map((item) => item.revealIndex));
  return maxRevealIndex;
}

/** Возвращает время завершения раскрытия ответов раунда. */
export function getRoundAnswersRevealEndDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return roundResultTimesRevealDelayMs;
}

/** Возвращает задержку раскрытия времени ответов. */
export function getRoundTimesRevealDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return roundResultTimesRevealDelayMs;
}

/** Возвращает последовательность начисления очков игрокам. */
export function getRoundPointSequence(
  room: GameRoom,
  question: GameRoom["questions"][number],
): Array<{ player: GameRoom["players"][number]; points: number }> {
  const roundPoints = getRoundPointsByProfile(room, question);
  return room.players
    .map((player) => ({ player, points: roundPoints.get(player.profileId) ?? 0 }))
    .filter((entry) => entry.points > 0)
    .sort((left, right) => {
      if (left.points !== right.points) return left.points - right.points;
      return getRoundTimelinePlayerLabel(left.player).localeCompare(
        getRoundTimelinePlayerLabel(right.player),
        "ru",
      );
    });
}

/** Возвращает задержку старта анимации счёта. */
export function getRoundScoreAnimationStartDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return roundResultScoreAnimationStartMs;
}

/** Возвращает шаг задержки между начислениями очков. */
export function getRoundScoreStepDelayMs(pointSequenceCount = 1): number {
  if (pointSequenceCount <= 1) return 0;

  const latestScoreStartMs =
    roundResultScoreboardSortMs - scoreValueAnimationMs - roundResultScoreboardLeadMs;
  const availableMs = Math.max(0, latestScoreStartMs - roundResultScoreAnimationStartMs);
  return Math.floor(availableMs / (pointSequenceCount - 1));
}

/** Возвращает задержку финальной сортировки scoreboard. */
export function getRoundScoreboardSortDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return roundResultScoreboardSortMs;
}

/** Возвращает задержку запуска таймера перехода к следующему этапу. */
export function getRoundResultTimerDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return 0;
}

/** Возвращает задержку полного перехода к следующему этапу после результата раунда. */
export function getRoundResultTransitionEndDelayMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  void room;
  void question;
  return roundResultTransitionMs;
}

/** Возвращает timestamp начала таймлайна результата раунда. */
export function getRoundResultTimelineStartMs(question: GameRoom["questions"][number]): number {
  const completedAtMs = question.completedAt
    ? new Date(question.completedAt).getTime()
    : Number.NaN;
  return Number.isNaN(completedAtMs) ? Date.now() : completedAtMs;
}

/** Возвращает валидный timestamp или NaN. */
function getRoundResultTimestampMs(value?: string | null): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

/** Возвращает серверный timestamp перехода к следующему вопросу, если он известен. */
function getServerRoundTransitionEndMs(room: GameRoom): number {
  if (room.status !== "active") return Number.NaN;

  const nextQuestionAtMs = getRoundResultTimestampMs(room.nextQuestionAt);
  if (Number.isFinite(nextQuestionAtMs)) return nextQuestionAtMs;

  return getRoundResultTimestampMs(room.currentQuestion?.startedAt);
}

/** Возвращает timestamp старта таймера следующего этапа. */
export function getRoundResultTimerStartMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return getRoundResultTimelineStartMs(question) + getRoundResultTimerDelayMs(room, question);
}

/** Возвращает timestamp завершения перехода к следующему этапу. */
export function getRoundResultTransitionEndMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  const serverTransitionEndMs = getServerRoundTransitionEndMs(room);
  if (Number.isFinite(serverTransitionEndMs)) return serverTransitionEndMs;

  return (
    getRoundResultTimelineStartMs(question) + getRoundResultTransitionEndDelayMs(room, question)
  );
}

/** Возвращает длительность перехода к следующему этапу по фактическому дедлайну. */
export function getRoundResultTransitionDurationMs(
  room: GameRoom,
  question: GameRoom["questions"][number],
): number {
  return Math.max(
    1,
    getRoundResultTransitionEndMs(room, question) - getRoundResultTimelineStartMs(question),
  );
}
