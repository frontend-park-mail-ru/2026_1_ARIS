/**
 * DOM/runtime адаптеры страницы игр.
 *
 * Собирают refresh-опции и sync callbacks поверх runtime-объектов, не храня
 * состояние страницы внутри runtime-слоя.
 */
import type { GameRoom } from "../../../api/games";
import {
  focusCurrentAnswerInput,
  syncCurrentAnswerFormDom as syncCurrentAnswerFormDomBase,
  syncPlayersRailAnswerDom as syncPlayersRailAnswerDomBase,
} from "./dom-sync";
import type { GamesDomRefreshOptions } from "./dom-refresh";

type CountdownRuntime = {
  start: (root: Document | HTMLElement) => void;
};

type SyncRuntime = {
  sync: () => void;
};

type RoomSocketRuntime = {
  sync: (roomId: string) => void;
};

export type GamesPageDomAdaptersOptions = {
  getRoot: () => Document | HTMLElement | null;
  getRoom: () => GameRoom | null;
  getSubmittedQuestionId: () => string;
  getSubmittedAnswerValue: () => string;
  renderContent: () => string;
  renderPageShell: () => string;
  renderOverlay: () => string;
  renderQuestionReportOverlay: () => string;
  renderPlayersRail: (room: GameRoom) => string;
  renderRoomChat: (room: GameRoom) => string;
  countdownRuntime: CountdownRuntime;
  roomChatRuntime: SyncRuntime;
  roomSocketRuntime: RoomSocketRuntime;
  roomsAutoRefreshRuntime: SyncRuntime;
  roomStateRefreshRuntime: SyncRuntime;
  schedulePopoverOffsets: (root: Document | HTMLElement) => void;
  scrollRoomChatToBottom: (root: Document | HTMLElement) => void;
};

export type GamesPageDomAdapters = ReturnType<typeof createGamesPageDomAdapters>;

/**
 * Создаёт DOM/runtime адаптеры для страницы игр.
 */
export function createGamesPageDomAdapters(options: GamesPageDomAdaptersOptions) {
  let lastFocusedQuestionId = "";

  /**
   * Ставит автофокус в ответ только один раз на каждый новый вопрос.
   */
  function focusCurrentQuestionAnswerInput(root: Document | HTMLElement): void {
    const question = options.getRoom()?.currentQuestion;
    if (!question) {
      lastFocusedQuestionId = "";
      return;
    }
    const input = root.querySelector<HTMLInputElement>("[data-games-answer-input]");
    if (!input) return;
    const isFocused = input.ownerDocument.activeElement === input;
    if (question.id === lastFocusedQuestionId && isFocused) return;

    focusCurrentAnswerInput(root);
    lastFocusedQuestionId = question.id;
  }

  /**
   * Собирает зависимости runtime-обновления DOM страницы игр.
   */
  function getDomRefreshOptions(): GamesDomRefreshOptions {
    return {
      root: options.getRoot(),
      room: options.getRoom(),
      renderContent: options.renderContent,
      renderPageShell: options.renderPageShell,
      renderOverlay: options.renderOverlay,
      renderQuestionReportOverlay: options.renderQuestionReportOverlay,
      renderPlayersRail: options.renderPlayersRail,
      renderRoomChat: options.renderRoomChat,
      startCountdown: (root) => options.countdownRuntime.start(root),
      focusAnswerInput: focusCurrentQuestionAnswerInput,
      syncRoomSubscription,
      syncRoomsAutoRefresh,
      syncRoomStateRefresh,
      syncRoomChatRuntime,
      schedulePopoverOffsets: options.schedulePopoverOffsets,
      scrollRoomChatToBottom: options.scrollRoomChatToBottom,
    };
  }

  /**
   * Синхронизирует runtime чата комнаты.
   */
  function syncRoomChatRuntime(): void {
    options.roomChatRuntime.sync();
  }

  /**
   * Синхронизирует DOM формы ответа текущего вопроса.
   */
  function syncCurrentAnswerFormDom(): void {
    const room = options.getRoom();
    syncCurrentAnswerFormDomBase(
      options.getRoot(),
      room?.currentQuestion,
      options.getSubmittedQuestionId(),
      options.getSubmittedAnswerValue(),
    );
  }

  /**
   * Синхронизирует DOM rail игроков после локального ответа.
   */
  function syncPlayersRailAnswerDom(room: GameRoom | null = options.getRoom()): void {
    syncPlayersRailAnswerDomBase(options.getRoot(), room);
  }

  /**
   * Синхронизирует подписку socket runtime с текущей комнатой.
   */
  function syncRoomSubscription(): void {
    options.roomSocketRuntime.sync(options.getRoom()?.id ?? "");
  }

  /**
   * Синхронизирует auto-refresh списка комнат.
   */
  function syncRoomsAutoRefresh(): void {
    options.roomsAutoRefreshRuntime.sync();
  }

  /**
   * Синхронизирует polling текущей комнаты.
   */
  function syncRoomStateRefresh(): void {
    options.roomStateRefreshRuntime.sync();
  }

  return {
    getDomRefreshOptions,
    syncRoomChatRuntime,
    syncCurrentAnswerFormDom,
    syncPlayersRailAnswerDom,
    syncRoomSubscription,
    syncRoomsAutoRefresh,
    syncRoomStateRefresh,
  };
}
