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
    correctAnswer === undefined
      ? gameT("report.notRevealedAtReport")
      : formatStoredAnswer(correctAnswer);
  const reporterAnswerLabel = getQuestionReporterAnswerLabel(room, question);
  const pageUrl = options.pageUrl ?? (typeof window === "undefined" ? "" : window.location.href);
  const reportedAt = options.reportedAt ?? new Date();
  const unknown = gameT("report.unknown");

  return [
    gameT("report.descriptionIntro"),
    "",
    gameT("room.reportGame", { game: getPrimaryGameCatalogItem().title, type: room.gameType }),
    gameT("report.roomLine", { title: room.title || gameT("report.roomUntitled"), id: room.id }),
    gameT("report.roomStatus", { status: room.status }),
    gameT("report.questionPosition", {
      position: question.position || room.currentQuestionIndex || unknown,
      total: room.questionCount,
    }),
    gameT("report.questionId", { id: question.id || unknown }),
    gameT("report.questionText", { text: question.text }),
    gameT("report.correctAnswer", { answer: correctAnswerLabel }),
    gameT("report.reporterAnswer", { answer: reporterAnswerLabel }),
    "",
    gameT("report.reporter", {
      name: player?.name || user?.firstName || gameT("common.userFallback"),
      profileId: player?.profileId || user?.id || unknown,
    }),
    user?.login ? gameT("report.login", { login: user.login }) : "",
    pageUrl ? gameT("report.page", { url: pageUrl }) : "",
    gameT("report.time", { time: reportedAt.toISOString() }),
  ]
    .filter(Boolean)
    .join("\n");
}
