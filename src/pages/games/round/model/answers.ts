import type { GameAnswer, GameQuestion } from "./types";

/** Возвращает отклонение ответа игрока от правильного ответа. */
export function getAnswerDelta(
  answer: GameAnswer | null | undefined,
  correctAnswer: number | null,
): number | null {
  if (!answer || answer.answer === null || correctAnswer === null) return null;
  return answer.answer - correctAnswer;
}

/** Возвращает тональность отклонения ответа от правильного значения. */
export function getAnswerDeltaTone(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return "missing";
  if (delta === 0) return "exact";
  return delta > 0 ? "positive" : "negative";
}

/** Находит ответ игрока в завершённом вопросе. */
export function getQuestionAnswer(question: GameQuestion, profileId: string): GameAnswer | null {
  return question.answers.find((answer) => answer.profileId === profileId) ?? null;
}

/** Проверяет, что игрок не дал пригодный для подсчёта ответ. */
export function isMissingRoundAnswer(answer: GameAnswer | null | undefined): boolean {
  return !answer || answer.answer === null || answer.distance === null;
}

/** Проверяет, должны ли два ответа делить место в раунде. */
export function areRoundAnswersTied(left: GameAnswer | null, right: GameAnswer | null): boolean {
  if (isMissingRoundAnswer(left) || isMissingRoundAnswer(right)) return false;
  const leftDistance = left?.distance ?? Number.POSITIVE_INFINITY;
  const rightDistance = right?.distance ?? Number.POSITIVE_INFINITY;
  const leftTime = Math.round((left?.responseTimeMs ?? Number.POSITIVE_INFINITY) / 10);
  const rightTime = Math.round((right?.responseTimeMs ?? Number.POSITIVE_INFINITY) / 10);
  return leftDistance === rightDistance && leftTime === rightTime;
}

/** Возвращает сторону ответа относительно правильного значения. */
export function getAnswerAxisSide(
  answer: GameAnswer | null,
  correctAnswer: number | null,
): -1 | 0 | 1 {
  if (!answer || answer.answer === null || correctAnswer === null) return 0;
  if (answer.answer < correctAnswer) return -1;
  if (answer.answer > correctAnswer) return 1;
  return 0;
}
