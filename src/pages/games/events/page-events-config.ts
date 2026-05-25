/**
 * Конфигурация DOM-событий страницы игр.
 *
 * Собирает event binder из state/updater/action зависимостей и оставляет
 * entrypoint без списка UI-side-effect helpers.
 */
import type { GameRoom } from "../../../api/games";
import { showAppToast } from "../../../utils/toast";
import type { GamesPageActionHandlers } from "../actions/page-action-handlers";
import { closeGamesMenus } from "../render/floating-menu";
import type { LobbyPresenterOptions } from "../render/lobby-presenter";
import { getErrorMessage } from "../shared/errors";
import { scheduleGamesPopoverViewportOffsets } from "../shared/popovers";
import type { GamesPageState } from "../state/store";
import type { RoomChatRefreshOptions, RoomChatStatePatch } from "../runtime/dom-updaters";
import { createGamesPageEventBinder, type GamesPageEventBinderRoot } from "./page-binder";

export type GamesPageEventsConfigOptions = {
  actionHandlers: GamesPageActionHandlers;
  getState: () => Readonly<GamesPageState>;
  reportedQuestionKeys: Set<string>;
  reportingQuestionKeys: Set<string>;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  setQuestionReportOverlayState: (patch: Partial<GamesPageState>) => void;
  setRoomChatState: (patch: RoomChatStatePatch, options?: RoomChatRefreshOptions) => void;
  getLobbyRenderOptions: () => LobbyPresenterOptions;
  isRoomCreatedByCurrentUser: (room: GameRoom) => boolean;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  showRoomFullMessage: () => void;
  syncQuestionReportButtons: (questionKey: string) => void;
  getCurrentPlayer: (room: GameRoom | null) => GameRoom["players"][number] | null | undefined;
  getRoomTitleValue: (room: GameRoom) => string;
};

/**
 * Создаёт binder DOM-событий страницы игр.
 */
export function createGamesPageEventsConfig(options: GamesPageEventsConfigOptions) {
  const bindEvents = createGamesPageEventBinder({
    ...options.actionHandlers,
    getState: options.getState,
    reportedQuestionKeys: options.reportedQuestionKeys,
    reportingQuestionKeys: options.reportingQuestionKeys,
    patchGamesState: options.patchGamesState,
    setGamesState: options.setGamesState,
    setGamesOverlayState: options.setGamesOverlayState,
    setQuestionReportOverlayState: options.setQuestionReportOverlayState,
    setRoomChatState: options.setRoomChatState,
    getLobbyRenderOptions: options.getLobbyRenderOptions,
    scheduleGamesPopoverViewportOffsets,
    getErrorMessage,
    showAppToast,
    isRoomCreatedByCurrentUser: options.isRoomCreatedByCurrentUser,
    shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
    showRoomFullMessage: options.showRoomFullMessage,
    closeGamesMenus,
    syncQuestionReportButtons: options.syncQuestionReportButtons,
    getCurrentPlayer: options.getCurrentPlayer,
    getRoomTitleValue: options.getRoomTitleValue,
  });

  /**
   * Привязывает события к DOM-root страницы.
   */
  return function bindGamesEvents(root: Document | HTMLElement): void {
    bindEvents(root as GamesPageEventBinderRoot);
  };
}
