import type { GameRoom } from "../../../../api/games";
import type { GamesErrorTarget } from "../../state/store";
import {
  canCurrentPlayerForceResume,
  canCurrentPlayerPause,
  getCurrentRoomPlayer,
  getPausedByPlayer,
} from "../../room/selectors";
import {
  renderGamePlayPresenter,
  renderGamePlayersRailPresenter,
  renderPauseActionPresenter,
} from "../game-stage";
import type { GamesPageRendererOptions } from "./types";

type PageGameStageRendererOptions = Pick<
  GamesPageRendererOptions,
  "getState" | "getCurrentPlayer" | "getPlayerAvatarUrl"
> & {
  renderInlineError: (target: GamesErrorTarget) => string;
  renderQuestionActionsMenuButton: (
    room: GameRoom,
    question: NonNullable<GameRoom["currentQuestion"]> | GameRoom["questions"][number],
  ) => string;
};

/**
 * Создаёт render-адаптер игровой сцены.
 */
export function createPageGameStageRenderer(options: PageGameStageRendererOptions) {
  /**
   * Собирает зависимости presenter игровой сцены.
   */
  function getGameStageRenderOptions(room: GameRoom) {
    return {
      state: options.getState(),
      room,
      getCurrentPlayer: options.getCurrentPlayer,
      getCurrentRoomPlayer,
      getPausedByPlayer,
      canCurrentPlayerPause,
      canCurrentPlayerForceResume,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      renderInlineError: options.renderInlineError,
      renderQuestionActionsMenuButton: options.renderQuestionActionsMenuButton,
    };
  }

  /**
   * Рендерит action-кнопку паузы.
   */
  function renderPauseAction(room: GameRoom): string {
    return renderPauseActionPresenter(getGameStageRenderOptions(room));
  }

  /**
   * Рендерит центральную игровую сцену.
   */
  function renderGamePlay(room: GameRoom): string {
    return renderGamePlayPresenter(getGameStageRenderOptions(room));
  }

  /**
   * Рендерит боковую рейку игроков.
   */
  function renderGamePlayersRail(room: GameRoom): string {
    return renderGamePlayersRailPresenter(getGameStageRenderOptions(room));
  }

  return {
    renderPauseAction,
    renderGamePlay,
    renderGamePlayersRail,
  };
}
