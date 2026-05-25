import {
  renderGamesOverlayPresenter,
  renderQuestionReportOverlayPresenter,
} from "../overlay-presenter";
import type { GamesPageRendererOptions } from "./types";

type PageOverlayRendererOptions = Pick<
  GamesPageRendererOptions,
  | "getState"
  | "reportedQuestionKeys"
  | "reportingQuestionKeys"
  | "getRoomTitleValue"
  | "getPlayerAvatarUrl"
  | "isCurrentRoomCreator"
>;

/**
 * Создаёт render-адаптер overlay-слоя страницы игр.
 */
export function createPageOverlayRenderer(options: PageOverlayRendererOptions) {
  /**
   * Собирает зависимости presenter overlay-слоя.
   */
  function getOverlayPresenterOptions() {
    return {
      state: options.getState(),
      reportedQuestionKeys: options.reportedQuestionKeys,
      reportingQuestionKeys: options.reportingQuestionKeys,
      getRoomTitleValue: options.getRoomTitleValue,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      isCurrentRoomCreator: options.isCurrentRoomCreator,
    };
  }

  /**
   * Рендерит overlay страницы игр.
   */
  function renderGamesOverlayContent(): string {
    return renderGamesOverlayPresenter(getOverlayPresenterOptions());
  }

  /**
   * Рендерит overlay жалобы на вопрос.
   */
  function renderQuestionReportOverlayContent(): string {
    return renderQuestionReportOverlayPresenter(getOverlayPresenterOptions());
  }

  return {
    renderGamesOverlayContent,
    renderQuestionReportOverlayContent,
  };
}
