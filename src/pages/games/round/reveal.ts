import type { GameRoom } from "../../../api/games";
import { getLatestCompletedQuestion } from "./model";
import { getRoundResultTransitionEndMs } from "./timeline";

/** Возвращает момент, до которого финальный раунд остается на экране перед итогами. */
export function getFinalRoundResultsUntil(
  room: GameRoom,
  question: GameRoom["questions"][number] | null,
): Date | null {
  if (room.status !== "finished" || !question?.completedAt) return null;
  const completedAtMs = new Date(question.completedAt).getTime();
  if (Number.isNaN(completedAtMs)) return null;
  return new Date(getRoundResultTransitionEndMs(room, question));
}

/** Проверяет, нужно ли перед итогами игры еще показать результат последнего раунда. */
export function shouldShowFinalRoundResultBeforeSummary(room: GameRoom): boolean {
  if (room.status !== "finished") return false;
  const latestCompleted = getLatestCompletedQuestion(room);
  const resultsUntil = getFinalRoundResultsUntil(room, latestCompleted);
  return Boolean(resultsUntil && Date.now() < resultsUntil.getTime());
}

/** Проверяет, видим ли сейчас экран раскрытия результата раунда. */
export function isRoundResultRevealVisible(room: GameRoom): boolean {
  if (room.status === "finished") {
    return shouldShowFinalRoundResultBeforeSummary(room);
  }

  if (room.status !== "active") return false;

  const latestCompleted = getLatestCompletedQuestion(room);
  if (!latestCompleted) return false;

  const transitionEndMs = getRoundResultTransitionEndMs(room, latestCompleted);
  return Number.isFinite(transitionEndMs) && Date.now() < transitionEndMs;
}
