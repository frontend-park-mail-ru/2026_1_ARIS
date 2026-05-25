/**
 * Runtime-обновление DOM страницы игр.
 *
 * Обновляет уже смонтированную страницу через переданные render-адаптеры и
 * post-render синхронизацию, не импортируя глобальное состояние страницы.
 */
export { refreshRoomChatDom } from "./dom-refresh/chat";
export {
  refreshGamesDom,
  refreshGamesShellDom,
  shouldRerenderGamesShell,
} from "./dom-refresh/shell";
export { refreshGamesOverlayDom, refreshQuestionReportOverlayDom } from "./dom-refresh/overlay";
export type { GamesDomRefreshOptions, GamesDomRefreshRoot } from "./dom-refresh/types";
