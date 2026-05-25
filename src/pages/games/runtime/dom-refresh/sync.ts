import type { GamesDomRefreshOptions } from "./types";

/**
 * Выполняет общую post-render синхронизацию страницы игр.
 */
export function syncGamesDomAfterRender(
  options: GamesDomRefreshOptions,
  params: { syncRoomSubscription?: boolean } = {},
): void {
  const { root } = options;
  if (!root) return;

  options.startCountdown(root);
  options.focusAnswerInput(root);
  if (params.syncRoomSubscription) {
    options.syncRoomSubscription();
  }
  options.syncRoomsAutoRefresh();
  options.syncRoomStateRefresh();
  options.syncRoomChatRuntime();
  options.schedulePopoverOffsets(root);
  options.scrollRoomChatToBottom(root);
}
