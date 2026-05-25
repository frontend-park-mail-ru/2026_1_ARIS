import { formatStoredAnswer } from "../../round/model";
import { gameT } from "../../shared/i18n";
import { getPrimaryGameCatalogItem } from "../../shared/registry";
import { getCurrentRoomPlayer } from "../selectors";
import { getQuestionCorrectAnswer, getQuestionReporterAnswerLabel } from "./model";
import type { QuestionReportDescriptionOptions } from "./types";

/**
 * Собирает подробное описание жалобы для обращения в поддержку.
 */
export function buildQuestionReportDescription(options: QuestionReportDescriptionOptions): string {
  const { room, question, user } = options;
  const player = getCurrentRoomPlayer(room);
  const correctAnswer = getQuestionCorrectAnswer(question);
  const correctAnswerLabel =
    correctAnswer === undefined ? "не раскрыт на момент жалобы" : formatStoredAnswer(correctAnswer);
  const reporterAnswerLabel = getQuestionReporterAnswerLabel(room, question);
  const pageUrl = options.pageUrl ?? (typeof window === "undefined" ? "" : window.location.href);
  const reportedAt = options.reportedAt ?? new Date();

  return [
    "Пользователь пожаловался на вопрос в игровой комнате.",
    "",
    gameT("room.reportGame", { game: getPrimaryGameCatalogItem().title, type: room.gameType }),
    `Комната: ${room.title || "без названия"} (ID ${room.id})`,
    `Статус комнаты: ${room.status}`,
    `Вопрос: ${question.position || room.currentQuestionIndex || "неизвестно"} из ${room.questionCount}`,
    `ID вопроса: ${question.id || "неизвестно"}`,
    `Текст вопроса: ${question.text}`,
    `Правильный ответ: ${correctAnswerLabel}`,
    `Ответ пользователя: ${reporterAnswerLabel}`,
    "",
    `Пожаловался: ${player?.name || user?.firstName || "Пользователь"} (profileId ${player?.profileId || user?.id || "неизвестно"})`,
    user?.login ? `Логин: ${user.login}` : "",
    pageUrl ? `Страница: ${pageUrl}` : "",
    `Время жалобы: ${reportedAt.toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");
}
