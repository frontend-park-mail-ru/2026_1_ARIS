/**
 * Presenter игровой сцены.
 *
 * Выбирает экран активного раунда, паузы, промежуточного результата или
 * финала без привязки к глобальному состоянию страницы.
 */
import { isRoomInStartCountdown, isRoomPaused } from "../room/selectors";
import { renderFinishedGameStage } from "./game-stage/final";
import { renderLatestRoundResultStage } from "./game-stage/round";
import type { RenderGamePlayPresenterOptions } from "./game-stage/types";
import {
  renderActiveRoundStage,
  renderGameStartingStage,
  renderPauseAction,
  renderPauseStage,
} from "./play-stage";
import { renderGamePlayersRail } from "./scoreboard";
import { renderProtectedGameProfileLink } from "./room/players";

export type { RenderGamePlayPresenterOptions } from "./game-stage/types";

/**
 * Рендерит action-кнопку паузы для панели комнаты.
 */
export function renderPauseActionPresenter(options: RenderGamePlayPresenterOptions): string {
  return renderPauseAction({
    room: options.room,
    loading: options.state.loading,
    canPause: options.canCurrentPlayerPause(options.room),
    currentPlayer: options.getCurrentRoomPlayer(options.room) ?? null,
    isStartCountdown: isRoomInStartCountdown(options.room),
  });
}

/**
 * Рендерит центральную игровую сцену.
 */
export function renderGameStagePresenter(options: RenderGamePlayPresenterOptions): string {
  const { room, state } = options;

  if (isRoomPaused(room)) {
    return renderPauseStage({
      room,
      loading: state.loading,
      pausedByPlayer: options.getPausedByPlayer(room) ?? null,
      canForceResume: options.canCurrentPlayerForceResume(room),
      currentPlayer: options.getCurrentRoomPlayer(room) ?? null,
    });
  }

  if (room.status === "finished") {
    return renderFinishedGameStage(options);
  }

  if (isRoomInStartCountdown(room)) {
    return renderGameStartingStage(room);
  }

  if (room.currentQuestion) {
    return renderActiveRoundStage({
      room,
      submittedQuestionId: state.submittedQuestionId,
      submittedAnswerValue: state.submittedAnswerValue,
      renderInlineError: options.renderInlineError,
    });
  }

  const latestRoundResult = renderLatestRoundResultStage(room, options);
  if (latestRoundResult) {
    return latestRoundResult;
  }

  return renderActiveRoundStage({
    room,
    submittedQuestionId: state.submittedQuestionId,
    submittedAnswerValue: state.submittedAnswerValue,
    renderInlineError: options.renderInlineError,
  });
}

/**
 * Рендерит обертку центральной игровой сцены.
 */
export function renderGamePlayPresenter(options: RenderGamePlayPresenterOptions): string {
  return `
    <div class="games-game-shell">
      ${renderGameStagePresenter(options)}
    </div>
  `;
}

/**
 * Рендерит боковую колонку игроков игровой комнаты.
 */
export function renderGamePlayersRailPresenter(options: RenderGamePlayPresenterOptions): string {
  return renderGamePlayersRail({
    room: options.room,
    loading: options.state.loading,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    renderProfileLink: renderProtectedGameProfileLink,
  });
}
