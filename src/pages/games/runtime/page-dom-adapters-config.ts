/**
 * Конфигурация DOM adapters страницы игр.
 *
 * Собирает render callbacks и runtime-объекты для точечного DOM sync в одном
 * runtime-слое.
 */
import type { GameRoom } from "../../../api/games";
import { scheduleGamesPopoverViewportOffsets } from "../shared/popovers";
import type { GamesPageState } from "../state/store";
import { scrollRoomChatToBottom } from "./dom-sync";
import { createGamesPageDomAdapters, type GamesPageDomAdapters } from "./page-dom-adapters";

type CountdownRuntime = {
  start: (root: Document | HTMLElement) => void;
};

type SyncRuntime = {
  sync: () => void;
};

type RoomSocketRuntime = {
  sync: (roomId: string) => void;
};

export type GamesPageDomAdaptersConfigOptions = {
  getRoot: () => Document | HTMLElement | null;
  getState: () => Readonly<GamesPageState>;
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
};

/**
 * Создаёт DOM adapters страницы игр.
 */
export function createGamesPageDomAdaptersConfig(
  options: GamesPageDomAdaptersConfigOptions,
): GamesPageDomAdapters {
  return createGamesPageDomAdapters({
    getRoot: options.getRoot,
    getRoom: () => options.getState().room,
    getSubmittedQuestionId: () => options.getState().submittedQuestionId,
    getSubmittedAnswerValue: () => options.getState().submittedAnswerValue,
    renderContent: options.renderContent,
    renderPageShell: options.renderPageShell,
    renderOverlay: options.renderOverlay,
    renderQuestionReportOverlay: options.renderQuestionReportOverlay,
    renderPlayersRail: options.renderPlayersRail,
    renderRoomChat: options.renderRoomChat,
    countdownRuntime: options.countdownRuntime,
    roomChatRuntime: options.roomChatRuntime,
    roomSocketRuntime: options.roomSocketRuntime,
    roomsAutoRefreshRuntime: options.roomsAutoRefreshRuntime,
    roomStateRefreshRuntime: options.roomStateRefreshRuntime,
    schedulePopoverOffsets: scheduleGamesPopoverViewportOffsets,
    scrollRoomChatToBottom,
  });
}
