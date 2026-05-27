import type { GameRoom } from "../../../../api/games";
import { formatStoredAnswer, getQuestionAnswer } from "../../round/model";
import type { ReportableGameQuestion } from "../../state/store";
import { gameT } from "../../shared/i18n";
import { getCurrentRoomPlayer } from "../selectors";

/**
 * Обрезает текст вопроса для заголовка обращения в поддержку.
 */
export function truncateQuestionReportText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1))}…`
    : normalized;
}

/**
 * Возвращает стабильный ключ вопроса внутри комнаты.
 */
export function getQuestionReportKey(room: GameRoom, question: ReportableGameQuestion): string {
  return `${room.id}:${question.id || question.position}`;
}

/**
 * Находит вопрос для жалобы среди текущего и завершенных вопросов комнаты.
 */
export function findReportableQuestion(
  room: GameRoom,
  questionKey: string,
): ReportableGameQuestion | null {
  if (room.currentQuestion && getQuestionReportKey(room, room.currentQuestion) === questionKey) {
    return room.currentQuestion;
  }
  return (
    room.questions.find((question) => getQuestionReportKey(room, question) === questionKey) ?? null
  );
}

/**
 * Возвращает правильный ответ, если он уже раскрыт в модели вопроса.
 */
export function getQuestionCorrectAnswer(
  question: ReportableGameQuestion,
): number | null | undefined {
  return "correctAnswer" in question ? question.correctAnswer : undefined;
}

/**
 * Возвращает текст вопроса и правильного ответа для копирования.
 */
export function getQuestionClipboardText(question: ReportableGameQuestion): string {
  const correctAnswer = getQuestionCorrectAnswer(question);
  const correctAnswerLabel =
    typeof correctAnswer === "number"
      ? formatStoredAnswer(correctAnswer)
      : gameT("report.notRevealed");

  return `${question.text}\n${gameT("report.correctAnswer", { answer: correctAnswerLabel })}`;
}

/**
 * Возвращает ответ автора жалобы в человекочитаемом виде.
 */
export function getQuestionReporterAnswerLabel(
  room: GameRoom,
  question: ReportableGameQuestion,
): string {
  const player = getCurrentRoomPlayer(room);
  if (!player?.profileId) return gameT("report.unknown");

  if ("answers" in question) {
    const answer = getQuestionAnswer(question, player.profileId);
    return formatStoredAnswer(answer?.answer ?? null);
  }

  return question.hasAnswered ? gameT("report.answeredHidden") : gameT("report.noAnswer");
}
