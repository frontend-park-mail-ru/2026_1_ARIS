import { escapeHtml } from "../../../../utils/avatar";
import type { GameRoom } from "../../../../api/games";
import type { ReportableGameQuestion } from "../../state/store";
import { gameT } from "../../shared/i18n";
import { getQuestionReportKey } from "./model";
import type { QuestionReportState, QuestionReportUiOptions } from "./types";

/**
 * Возвращает подпись кнопки жалобы с учетом текущей отправки.
 */
export function getQuestionReportButtonLabel(
  questionKey: string,
  state: QuestionReportState,
): string {
  if (state.reportedKeys.has(questionKey)) return gameT("menu.reportSent");
  if (state.reportingKeys.has(questionKey)) return gameT("menu.reporting");
  return gameT("modal.reportTitle");
}

/**
 * Создаёт UI-модель состояния жалоб на вопросы.
 */
export function createQuestionReportUi(options: QuestionReportUiOptions) {
  /**
   * Возвращает текущий снимок состояния жалоб на вопросы.
   */
  function getState(): QuestionReportState {
    return {
      reportingKeys: options.reportingKeys,
      reportedKeys: options.reportedKeys,
      openQuestionKey: options.getOpenQuestionKey(),
    };
  }

  /**
   * Синхронизирует DOM-кнопки жалобы после изменения статуса отправки.
   */
  function syncButtons(questionKey: string): void {
    const root = options.getRoot();
    if (!root) return;
    root.querySelectorAll<HTMLButtonElement>("[data-games-report-question]").forEach((button) => {
      if (button.getAttribute("data-games-report-question") !== questionKey) return;
      const state = getState();
      const isReporting = state.reportingKeys.has(questionKey);
      const isReported = state.reportedKeys.has(questionKey);
      button.disabled = isReporting || isReported;
      button.textContent = getQuestionReportButtonLabel(questionKey, state);
    });
  }

  return { getState, syncButtons };
}

/**
 * Рендерит inline-кнопку жалобы на вопрос.
 */
export function renderQuestionReportButton(options: {
  room: GameRoom;
  question: ReportableGameQuestion;
  state: QuestionReportState;
  variant?: "inline" | "card";
}): string {
  const { room, question, state, variant = "inline" } = options;
  const questionKey = getQuestionReportKey(room, question);
  const isReporting = state.reportingKeys.has(questionKey);
  const isReported = state.reportedKeys.has(questionKey);

  return `
    <button
      type="button"
      class="games-question-report games-question-report--${variant}"
      data-games-report-question="${escapeHtml(questionKey)}"
      ${isReporting || isReported ? "disabled" : ""}
    >
      ${escapeHtml(getQuestionReportButtonLabel(questionKey, state))}
    </button>
  `;
}

/**
 * Рендерит кнопку меню действий для вопроса.
 */
export function renderQuestionActionsMenuButton(options: {
  room: GameRoom;
  question: ReportableGameQuestion;
  state: QuestionReportState;
}): string {
  const questionKey = getQuestionReportKey(options.room, options.question);
  const isOpen = options.state.openQuestionKey === questionKey;

  return `
    <button
      type="button"
      class="games-menu-toggle games-question-menu-toggle"
      data-games-question-menu-toggle="${escapeHtml(questionKey)}"
      aria-label="${escapeHtml(gameT("report.questionActions"))}"
      aria-expanded="${isOpen ? "true" : "false"}"
    >
      <span></span><span></span><span></span>
    </button>
  `;
}
