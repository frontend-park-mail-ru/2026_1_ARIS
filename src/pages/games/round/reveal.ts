import type { GameRoom } from "../../../api/games";
import { finalRoundResultHoldMs } from "../shared/constants";
import { getLatestCompletedQuestion } from "./model";

/** Возвращает момент, до которого финальный раунд остается на экране перед итогами. */
export function getFinalRoundResultsUntil(
  room: GameRoom,
  question: GameRoom["questions"][number] | null,
): Date | null {
  if (room.status !== "finished" || !question?.completedAt) return null;
  const completedAtMs = new Date(question.completedAt).getTime();
  if (Number.isNaN(completedAtMs)) return null;
  return new Date(completedAtMs + finalRoundResultHoldMs);
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
  return (
    (room.status === "active" && !room.currentQuestion) ||
    (room.status === "finished" && shouldShowFinalRoundResultBeforeSummary(room))
  );
}
