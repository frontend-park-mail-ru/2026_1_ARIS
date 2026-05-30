import { getQuestionReportConfirmPatch } from "../shared";
import type { HandleGamesRoomMenusClickOptions } from "../types";
import { gameT } from "../../../shared/i18n";

/**
 * Обрабатывает action копирования вопроса из floating menu.
 */
function handleQuestionCopyAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (!action.startsWith("question-copy:")) return false;
  const questionKey = action.slice("question-copy:".length);
  void options.handleCopyQuestionAnswer(questionKey).catch(() => {
    options.setGamesOverlayState({ ...options.closeGamesMenus(), message: "", error: "" });
    options.showAppToast(gameT("copy.questionError"));
  });
  return true;
}

/**
 * Обрабатывает action жалобы на вопрос из floating menu.
 */
function handleQuestionReportAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (!action.startsWith("question-report:")) return false;
  const questionKey = action.slice("question-report:".length);
  if (
    !questionKey ||
    options.reportedQuestionKeys.has(questionKey) ||
    options.reportingQuestionKeys.has(questionKey)
  ) {
    options.setGamesOverlayState({
      ...options.closeGamesMenus(),
      message: "",
      error: "",
      errorTarget: "",
    });
    return true;
  }

  options.setGamesOverlayState(getQuestionReportConfirmPatch(questionKey, options.closeGamesMenus));
  return true;
}

/**
 * Обрабатывает question actions floating menu.
 */
export function handleQuestionFloatingMenuAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  return handleQuestionCopyAction(action, options) || handleQuestionReportAction(action, options);
}
