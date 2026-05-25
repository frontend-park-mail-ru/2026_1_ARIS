import type { GamesPageState } from "../../state/store";

type QuestionReportState = Pick<GamesPageState, "reportConfirmQuestionKey">;

export type HandleGamesQuestionReportClickOptions = {
  state: QuestionReportState;
  closeGamesMenus: () => Partial<GamesPageState>;
  handleReportQuestion: (questionKey: string) => Promise<void>;
  handleReportQuestionError: (questionKey: string, error: unknown) => void;
  setQuestionReportOverlayState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Проверяет click по кнопке закрытия модалки или по её overlay.
 */
function isModalCloseClick(target: Element): boolean {
  const reportModal = target.closest("[data-games-report-modal]");
  return Boolean(
    target.closest("[data-games-report-close]") ||
    (reportModal instanceof HTMLElement && reportModal === target),
  );
}

/**
 * Возвращает patch открытия confirm-модалки жалобы на вопрос.
 */
function getOpenQuestionReportPatch(
  questionKey: string,
  closeGamesMenus: () => Partial<GamesPageState>,
): Partial<GamesPageState> {
  return {
    ...closeGamesMenus(),
    reportConfirmQuestionKey: questionKey,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    message: "",
    error: "",
  };
}

/**
 * Обрабатывает открытие confirm-модалки жалобы на вопрос.
 */
function handleQuestionReportOpenClick(
  event: Event,
  target: Element,
  options: HandleGamesQuestionReportClickOptions,
): boolean {
  const reportQuestionButton = target.closest("[data-games-report-question]");
  if (!(reportQuestionButton instanceof HTMLButtonElement)) return false;

  event.preventDefault();
  const questionKey = reportQuestionButton.getAttribute("data-games-report-question") ?? "";
  if (!questionKey) return true;

  options.setQuestionReportOverlayState(
    getOpenQuestionReportPatch(questionKey, options.closeGamesMenus),
  );
  return true;
}

/**
 * Обрабатывает закрытие confirm-модалки жалобы на вопрос.
 */
function handleQuestionReportCloseClick(
  event: Event,
  target: Element,
  options: HandleGamesQuestionReportClickOptions,
): boolean {
  if (!isModalCloseClick(target)) return false;

  event.preventDefault();
  options.setQuestionReportOverlayState({ reportConfirmQuestionKey: "" });
  return true;
}

/**
 * Обрабатывает подтверждение жалобы на вопрос.
 */
function handleQuestionReportConfirmClick(
  event: Event,
  target: Element,
  options: HandleGamesQuestionReportClickOptions,
): boolean {
  if (!target.closest("[data-games-report-confirm]")) return false;

  event.preventDefault();
  const questionKey = options.state.reportConfirmQuestionKey;
  options.setQuestionReportOverlayState({ reportConfirmQuestionKey: "" });
  void options.handleReportQuestion(questionKey).catch((error: unknown) => {
    options.handleReportQuestionError(questionKey, error);
  });
  return true;
}

/**
 * Обрабатывает click-события жалоб на вопросы комнаты.
 */
export function handleGamesQuestionReportClick(
  event: Event,
  target: Element,
  options: HandleGamesQuestionReportClickOptions,
): boolean {
  if (handleQuestionReportOpenClick(event, target, options)) return true;
  if (handleQuestionReportCloseClick(event, target, options)) return true;
  return handleQuestionReportConfirmClick(event, target, options);
}
