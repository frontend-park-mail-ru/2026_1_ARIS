import type { GameRoom } from "../../../../api/games";
import { renderQuestionActionsMenuButton as renderQuestionActionsMenuButtonView } from "../../room/question-report";
import type { GamesPageRendererOptions } from "./types";

type PageQuestionReportRendererOptions = Pick<GamesPageRendererOptions, "questionReportUi">;

/**
 * Создаёт render-адаптер действий вопроса.
 */
export function createPageQuestionReportRenderer(options: PageQuestionReportRendererOptions) {
  /**
   * Рендерит кнопку меню действий вопроса.
   */
  function renderQuestionActionsMenuButton(
    room: GameRoom,
    question: NonNullable<GameRoom["currentQuestion"]> | GameRoom["questions"][number],
  ): string {
    return renderQuestionActionsMenuButtonView({
      room,
      question,
      state: options.questionReportUi.getState(),
    });
  }

  /**
   * Синхронизирует кнопки жалобы на вопрос после async-операций.
   */
  function syncQuestionReportButtons(questionKey: string): void {
    options.questionReportUi.syncButtons(questionKey);
  }

  return {
    renderQuestionActionsMenuButton,
    syncQuestionReportButtons,
  };
}
