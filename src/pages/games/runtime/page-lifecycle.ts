export type GamesPageLifecycleOptions = {
  setRoot: (root: Document | HTMLElement) => void;
  getRoot: () => Document | HTMLElement | null;
  bindEvents: (root: Document | HTMLElement) => void;
  startCountdown: (root: Document | HTMLElement) => void;
  focusAnswerInput: (root: Document | HTMLElement) => void;
  syncRoomSubscription: () => void;
  syncRoomsAutoRefresh: () => void;
  syncRoomStateRefresh: () => void;
  syncRoomChatRuntime: () => void;
  hasRoom: () => boolean;
  refreshCurrentRoomSilently: () => void;
  schedulePopoverOffsets: (root: Document | HTMLElement) => void;
  scrollRoomChatToBottom: (root: Document | HTMLElement) => void;
  stopCountdown: () => void;
  stopRoomsAutoRefresh: () => void;
  stopRoomStateRefresh: () => void;
  stopRoomChat: () => void;
  closeRoomSocket: () => void;
};

/**
 * Запускает runtime страницы игр после монтирования DOM.
 */
export function initGamesPageLifecycle(
  root: Document | HTMLElement,
  options: GamesPageLifecycleOptions,
): void {
  options.setRoot(root);
  options.bindEvents(root);
  options.startCountdown(root);
  options.focusAnswerInput(root);
  options.syncRoomSubscription();
  options.syncRoomsAutoRefresh();
  options.syncRoomStateRefresh();
  options.syncRoomChatRuntime();
  if (options.hasRoom()) {
    options.refreshCurrentRoomSilently();
  }
  options.schedulePopoverOffsets(root);
  options.scrollRoomChatToBottom(root);
}

/**
 * Останавливает runtime страницы игр при размонтировании.
 */
export function teardownGamesPageLifecycle(options: GamesPageLifecycleOptions): void {
  options.stopCountdown();
  options.stopRoomsAutoRefresh();
  options.stopRoomStateRefresh();
  options.stopRoomChat();
  options.closeRoomSocket();
}

/**
 * Синхронизирует popover-координаты страницы при изменении viewport.
 */
export function syncGamesPageResize(options: GamesPageLifecycleOptions): void {
  const root = options.getRoot();
  if (!root) return;
  options.schedulePopoverOffsets(root);
}

/**
 * Останавливает runtime, если страница игр больше не смонтирована.
 */
export function teardownGamesPageLifecycleWhenUnmounted(options: GamesPageLifecycleOptions): void {
  if (!document.querySelector("[data-games-page]")) {
    teardownGamesPageLifecycle(options);
  }
}
