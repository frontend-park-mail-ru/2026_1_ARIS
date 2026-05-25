/**
 * Конфигурация lifecycle runtime страницы игр.
 *
 * Собирает init/resize/unmount callbacks вокруг root, DOM adapters и runtime
 * объектов, оставляя entrypoint без ручного списка start/stop операций.
 */
import { scheduleGamesPopoverViewportOffsets } from "../shared/popovers";
import { focusCurrentAnswerInput, scrollRoomChatToBottom } from "./dom-sync";
import type { GamesPageDomAdapters } from "./page-dom-adapters";
import { createGamesPageLifecycleOptionsFactory } from "./page-lifecycle-options";

type CountdownRuntime = {
  start: (root: Document | HTMLElement) => void;
  stop: () => void;
};

type SyncRuntime = {
  stop: () => void;
};

type RoomSocketRuntime = {
  close: () => void;
};

export type GamesPageLifecycleConfigOptions = {
  setRoot: (root: Document | HTMLElement) => void;
  getRoot: () => Document | HTMLElement | null;
  bindEvents: (root: Document | HTMLElement) => void;
  countdownRuntime: CountdownRuntime;
  roomsAutoRefreshRuntime: SyncRuntime;
  roomStateRefreshRuntime: SyncRuntime;
  roomChatRuntime: SyncRuntime;
  roomSocketRuntime: RoomSocketRuntime;
  domAdapters: Pick<
    GamesPageDomAdapters,
    "syncRoomSubscription" | "syncRoomsAutoRefresh" | "syncRoomStateRefresh" | "syncRoomChatRuntime"
  >;
  hasRoom: () => boolean;
  refreshCurrentRoomSilently: () => Promise<void> | void;
};

/**
 * Создаёт getter lifecycle-опций страницы игр.
 */
export function createGamesPageLifecycleConfig(options: GamesPageLifecycleConfigOptions) {
  return createGamesPageLifecycleOptionsFactory({
    setRoot: options.setRoot,
    getRoot: options.getRoot,
    bindEvents: options.bindEvents,
    startCountdown: (root) => options.countdownRuntime.start(root),
    focusAnswerInput: focusCurrentAnswerInput,
    syncRoomSubscription: options.domAdapters.syncRoomSubscription,
    syncRoomsAutoRefresh: options.domAdapters.syncRoomsAutoRefresh,
    syncRoomStateRefresh: options.domAdapters.syncRoomStateRefresh,
    syncRoomChatRuntime: options.domAdapters.syncRoomChatRuntime,
    hasRoom: options.hasRoom,
    refreshCurrentRoomSilently: options.refreshCurrentRoomSilently,
    schedulePopoverOffsets: scheduleGamesPopoverViewportOffsets,
    scrollRoomChatToBottom,
    stopCountdown: () => options.countdownRuntime.stop(),
    stopRoomsAutoRefresh: () => options.roomsAutoRefreshRuntime.stop(),
    stopRoomStateRefresh: () => options.roomStateRefreshRuntime.stop(),
    stopRoomChat: () => options.roomChatRuntime.stop(),
    closeRoomSocket: () => options.roomSocketRuntime.close(),
  });
}
