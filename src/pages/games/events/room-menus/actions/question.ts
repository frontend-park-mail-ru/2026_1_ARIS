import { getQuestionReportConfirmPatch } from "../shared";
import type { HandleGamesRoomMenusClickOptions } from "../types";

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
    options.setGamesState({ ...options.closeGamesMenus(), message: "", error: "" });
    options.showAppToast("Не удалось скопировать вопрос.");
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
    options.setGamesState({
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
