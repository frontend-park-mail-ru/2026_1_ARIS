/**
 * State-updater адаптеры DOM страницы игр.
 *
 * Слой связывает patch состояния с точечным DOM refresh и оставляет страницу
 * без прямого знания о runtime-функциях обновления.
 */
import type { GamesPageState } from "../state/store";
import {
  refreshGamesDom as refreshGamesDomRuntime,
  refreshGamesOverlayDom as refreshGamesOverlayDomRuntime,
  refreshQuestionReportOverlayDom as refreshQuestionReportOverlayDomRuntime,
  refreshRoomChatDom as refreshRoomChatDomRuntime,
  type GamesDomRefreshOptions,
} from "./dom-refresh";

export type RoomChatRefreshOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

export type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

export type GamesDomUpdatersOptions = {
  getDomRefreshOptions: () => GamesDomRefreshOptions;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
};

export type GamesDomUpdaters = {
  refreshGamesDom: () => void;
  refreshGamesOverlayDom: () => void;
  refreshQuestionReportOverlayDom: () => void;
  refreshRoomChatDom: (options?: RoomChatRefreshOptions) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  setQuestionReportOverlayState: (patch: Partial<GamesPageState>) => void;
  setRoomSocketOpenState: (socketOpen: boolean) => void;
  setRoomChatState: (patch: RoomChatStatePatch, options?: RoomChatRefreshOptions) => void;
};

/**
 * Создаёт updater-функции, которые патчат состояние и обновляют нужную часть DOM.
 */
export function createGamesDomUpdaters(options: GamesDomUpdatersOptions): GamesDomUpdaters {
  /**
   * Обновляет основное содержимое страницы игр.
   */
  function refreshGamesDom(): void {
    refreshGamesDomRuntime(options.getDomRefreshOptions());
  }

  /**
   * Обновляет общий overlay страницы игр.
   */
  function refreshGamesOverlayDom(): void {
    refreshGamesOverlayDomRuntime(options.getDomRefreshOptions());
  }

  /**
   * Обновляет overlay жалобы на вопрос.
   */
  function refreshQuestionReportOverlayDom(): void {
    refreshQuestionReportOverlayDomRuntime(options.getDomRefreshOptions());
  }

  /**
   * Обновляет DOM чата комнаты.
   */
  function refreshRoomChatDom(params: RoomChatRefreshOptions = {}): void {
    refreshRoomChatDomRuntime(options.getDomRefreshOptions(), params);
  }

  /**
   * Патчит состояние и обновляет всю интерактивную область игр.
   */
  function setGamesState(patch: Partial<GamesPageState>): void {
    options.patchGamesState(patch);
    refreshGamesDom();
  }

  /**
   * Патчит состояние и обновляет только общий overlay.
   */
  function setGamesOverlayState(patch: Partial<GamesPageState>): void {
    options.patchGamesState(patch);
    refreshGamesOverlayDom();
  }

  /**
   * Патчит состояние и обновляет только overlay жалобы.
   */
  function setQuestionReportOverlayState(patch: Partial<GamesPageState>): void {
    options.patchGamesState(patch);
    refreshQuestionReportOverlayDom();
  }

  /**
   * Сохраняет состояние socket-соединения комнаты без DOM refresh.
   */
  function setRoomSocketOpenState(socketOpen: boolean): void {
    options.patchGamesState({ socketOpen });
  }

  /**
   * Патчит состояние чата и обновляет только чат комнаты.
   */
  function setRoomChatState(patch: RoomChatStatePatch, params: RoomChatRefreshOptions = {}): void {
    options.patchGamesState(patch);
    refreshRoomChatDom(params);
  }

  return {
    refreshGamesDom,
    refreshGamesOverlayDom,
    refreshQuestionReportOverlayDom,
    refreshRoomChatDom,
    setGamesState,
    setGamesOverlayState,
    setQuestionReportOverlayState,
    setRoomSocketOpenState,
    setRoomChatState,
  };
}
