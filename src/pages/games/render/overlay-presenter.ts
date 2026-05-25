/**
 * Presenter overlay-слоя страницы игр.
 *
 * Собирает модальные окна, плавающее меню и overlay жалобы из текущего
 * состояния без доступа к глобальному store.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import {
  renderGamesOverlay,
  renderQuestionReportOverlay,
  type RenderGamesOverlayOptions,
} from "./overlay";
import { renderGamesFloatingMenu } from "./floating-menu";
import { renderPlayerProfileLink, renderRoomAuthor } from "./room/players";

export type OverlayPresenterOptions = {
  state: GamesPageState;
  reportedQuestionKeys: Set<string>;
  reportingQuestionKeys: Set<string>;
  getRoomTitleValue: (room: GameRoom) => string;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
};

/**
 * Собирает options для общего overlay render.
 */
export function getGamesOverlayRenderOptions(
  options: OverlayPresenterOptions,
): RenderGamesOverlayOptions {
  return {
    state: options.state,
    reportingQuestionKeys: options.reportingQuestionKeys,
    getRoomTitleValue: options.getRoomTitleValue,
    renderPlayerProfileLink: (player) =>
      renderPlayerProfileLink(player, options.getPlayerAvatarUrl),
    renderRoomAuthor: (room) => renderRoomAuthor(room, options.getPlayerAvatarUrl),
    renderFloatingMenu: () => renderGamesFloatingMenuPresenter(options),
  };
}

/**
 * Рендерит плавающее меню комнаты.
 */
export function renderGamesFloatingMenuPresenter(options: OverlayPresenterOptions): string {
  return renderGamesFloatingMenu({
    state: options.state,
    reportedQuestionKeys: options.reportedQuestionKeys,
    reportingQuestionKeys: options.reportingQuestionKeys,
    isCurrentRoomCreator: options.isCurrentRoomCreator,
  });
}

/**
 * Рендерит общий overlay страницы игр.
 */
export function renderGamesOverlayPresenter(options: OverlayPresenterOptions): string {
  return renderGamesOverlay(getGamesOverlayRenderOptions(options));
}

/**
 * Рендерит overlay жалобы на вопрос.
 */
export function renderQuestionReportOverlayPresenter(options: OverlayPresenterOptions): string {
  return renderQuestionReportOverlay(getGamesOverlayRenderOptions(options));
}
