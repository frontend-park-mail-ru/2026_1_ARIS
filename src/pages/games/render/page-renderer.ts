import { escapeHtml } from "../../../utils/avatar";
import type { GamesErrorTarget } from "../state/store";
import {
  renderGamesAppShell,
  renderGamesPageContent,
  renderGamesPageShell,
} from "./page-presenter";
import { createPageGameStageRenderer } from "./page-renderer/game-stage";
import { createPageLobbyRenderer } from "./page-renderer/lobby";
import { createPageOverlayRenderer } from "./page-renderer/overlay";
import { createPageQuestionReportRenderer } from "./page-renderer/question-report";
import { createPageRoomRenderer } from "./page-renderer/room";
import type { GamesPageRendererOptions } from "./page-renderer/types";

/**
 * Создаёт renderer страницы игр из чистых presenter-адаптеров.
 */
export function createGamesPageRenderer(options: GamesPageRendererOptions) {
  const lobbyRenderer = createPageLobbyRenderer(options);
  const questionReportRenderer = createPageQuestionReportRenderer(options);

  /**
   * Рендерит inline-ошибку для указанной области формы или футера.
   */
  function renderInlineGameError(target: GamesErrorTarget): string {
    const state = options.getState();
    if (!state.error || state.errorTarget !== target) return "";
    return `<p class="games-inline-error">${escapeHtml(state.error)}</p>`;
  }

  const gameStageRenderer = createPageGameStageRenderer({
    ...options,
    renderInlineError: renderInlineGameError,
    renderQuestionActionsMenuButton: questionReportRenderer.renderQuestionActionsMenuButton,
  });
  const roomRenderer = createPageRoomRenderer({
    ...options,
    renderPauseAction: gameStageRenderer.renderPauseAction,
    renderGamePlay: gameStageRenderer.renderGamePlay,
    renderInlineError: renderInlineGameError,
  });
  const overlayRenderer = createPageOverlayRenderer(options);

  /**
   * Рендерит центральный контент страницы игр.
   */
  function renderGamesContent(): string {
    return renderGamesPageContent({
      state: options.getState(),
      isCatalogRoute: options.isCatalogRoute(),
      renderLobbyContent: lobbyRenderer.renderLobbyContent,
      renderRoomPanel: roomRenderer.renderRoomPanel,
      renderRoomChat: roomRenderer.renderRoomChat,
    });
  }

  /**
   * Рендерит внутренний shell страницы игр.
   */
  function renderGamesShellContent(): string {
    return renderGamesPageShell({
      state: options.getState(),
      isCatalogRoute: options.isCatalogRoute(),
      renderLobbyContent: lobbyRenderer.renderLobbyContent,
      renderRoomPanel: roomRenderer.renderRoomPanel,
      renderRoomChat: roomRenderer.renderRoomChat,
      renderOverlay: overlayRenderer.renderGamesOverlayContent,
    });
  }

  /**
   * Рендерит полный app-shell страницы игр.
   */
  function renderGamesPageShellContent(): string {
    const state = options.getState();
    return renderGamesAppShell({
      state,
      shell: renderGamesShellContent(),
      renderPlayersRail: gameStageRenderer.renderGamePlayersRail,
      renderRoomChat: roomRenderer.renderRoomChat,
    });
  }

  return {
    getLobbyRenderOptions: lobbyRenderer.getLobbyRenderOptions,
    renderLobbyContent: lobbyRenderer.renderLobbyContent,
    renderQuestionActionsMenuButton: questionReportRenderer.renderQuestionActionsMenuButton,
    syncQuestionReportButtons: questionReportRenderer.syncQuestionReportButtons,
    renderPauseAction: gameStageRenderer.renderPauseAction,
    renderGamePlay: gameStageRenderer.renderGamePlay,
    renderGamePlayersRail: gameStageRenderer.renderGamePlayersRail,
    renderRoomChat: roomRenderer.renderRoomChat,
    renderRoomPanel: roomRenderer.renderRoomPanel,
    renderGamesContent,
    renderGamesOverlayContent: overlayRenderer.renderGamesOverlayContent,
    renderQuestionReportOverlayContent: overlayRenderer.renderQuestionReportOverlayContent,
    renderGamesShellContent,
    renderGamesPageShellContent,
    renderInlineGameError,
  };
}
