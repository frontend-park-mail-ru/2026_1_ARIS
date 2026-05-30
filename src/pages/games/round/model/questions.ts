import type { GameRoom } from "../../../../api/games";
import { gameT } from "../../shared/i18n";
import type { GameQuestion } from "./types";

/** Возвращает завершённые вопросы комнаты в серверном порядке. */
export function getCompletedQuestions(room: GameRoom): GameRoom["questions"] {
  return room.questions.filter((question) => question.status === "completed");
}

/** Возвращает последний завершённый вопрос комнаты. */
export function getLatestCompletedQuestion(room: GameRoom): GameQuestion | null {
  const completed = getCompletedQuestions(room);
  return completed.length ? completed[completed.length - 1]! : null;
}

/** Возвращает стабильную сигнатуру данных результата вопроса. */
export function getQuestionResultSignature(question: GameQuestion): string {
  const answersSignature = [...question.answers]
    .sort((left, right) => left.profileId.localeCompare(right.profileId, "ru"))
    .map((answer) =>
      [
        answer.profileId,
        answer.answer ?? "",
        answer.distance ?? "",
        answer.responseTimeMs ?? "",
        answer.isWinner ? "1" : "0",
      ].join(":"),
    )
    .join("|");
  return [
    question.id,
    question.status,
    question.correctAnswer ?? "",
    question.winnerProfileId,
    question.completedAt,
    answersSignature,
  ].join(";");
}

/** Формирует подпись текущей позиции вопроса в раунде. */
export function getQuestionPositionLabel(room: GameRoom, position?: number): string {
  const currentPosition =
    position ||
    room.currentQuestion?.position ||
    room.currentQuestionIndex ||
    Math.min(getCompletedQuestions(room).length + 1, room.questionCount);
  return gameT("results.questionPosition", {
    current: Math.min(Math.max(currentPosition, 1), room.questionCount),
    total: room.questionCount,
  });
}
