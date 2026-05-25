import type { GameRoom } from "../../../../api/games";
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

/** Формирует подпись текущей позиции вопроса в раунде. */
export function getQuestionPositionLabel(room: GameRoom, position?: number): string {
  const currentPosition =
    position ||
    room.currentQuestion?.position ||
    room.currentQuestionIndex ||
    Math.min(getCompletedQuestions(room).length + 1, room.questionCount);
  return `Вопрос ${Math.min(Math.max(currentPosition, 1), room.questionCount)} из ${room.questionCount}`;
}
