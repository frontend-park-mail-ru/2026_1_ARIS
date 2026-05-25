import type { GameRoom } from "../../../../api/games";
import { refreshGamesOverlayDom } from "./overlay";
import { syncGamesDomAfterRender } from "./sync";
import type { GamesDomRefreshOptions, GamesDomRefreshRoot } from "./types";

/**
 * Проверяет, нужно ли пересобрать app shell из-за смены layout комнаты.
 */
export function shouldRerenderGamesShell(
  root: GamesDomRefreshRoot,
  room: GameRoom | null,
): boolean {
  if (!root || !room) return false;
  const needsGameRoomLayout = room.status !== "waiting";
  const hasGameRoomLayout = Boolean(root.querySelector(".app-layout--game-room"));
  return needsGameRoomLayout !== hasGameRoomLayout;
}

/**
 * Обновляет content, rail и внешний чат без пересборки app shell.
 */
function refreshMountedGamesContent(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const content = root.querySelector<HTMLElement>("[data-games-content]");
  if (!content) return;

  content.innerHTML = options.renderContent();
  refreshGamesOverlayDom(options);

  const playersRail = root.querySelector<HTMLElement>("[data-games-room-players-rail]");
  if (playersRail) {
    playersRail.innerHTML = options.room ? options.renderPlayersRail(options.room) : "";
  }

  const externalChat = root.querySelector<HTMLElement>("[data-games-external-chat]");
  if (externalChat) {
    externalChat.innerHTML = options.room ? options.renderRoomChat(options.room) : "";
  }
}

/**
 * Обновляет контент страницы игр без пересборки app shell.
 */
export function refreshGamesDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  if (shouldRerenderGamesShell(root, options.room)) {
    refreshGamesShellDom(options);
    return;
  }

  refreshMountedGamesContent(options);
  syncGamesDomAfterRender(options);
}

/**
 * Пересобирает полный app shell страницы игр.
 */
export function refreshGamesShellDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const page = root.querySelector<HTMLElement>(".app-page");
  if (!page) return;

  page.outerHTML = options.renderPageShell();
  syncGamesDomAfterRender(options, { syncRoomSubscription: true });
}
