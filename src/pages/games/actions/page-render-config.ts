/**
 * Конфигурация initial render страницы игр.
 *
 * Собирает route/state/API зависимости для `renderGamesPage`, чтобы entrypoint
 * оставался тонким публичным входом страницы.
 */
import {
  forgetPublicGameGuestSession,
  getGameRoom,
  getPublicGameGuestSessionByInvite,
  getPublicGameRoom,
  joinGameRoom,
  type GameRoom,
} from "../../../api/games";
import {
  allowRoomAccessRecovery,
  canRecoverRoomAccess,
  getStoredRoomAccess,
  getStoredRoomSnapshot,
  rememberRoomAccess,
} from "../room/access";
import {
  getRequestedPublicInviteCode,
  getRequestedRoomId,
  isGamesCatalogRoute,
  isPublicGamesRoute,
  replaceWithGamesMenuRoute,
} from "../shared/navigation";
import { replaceGamesState, resetGamesState } from "../state/store";
import { createGamesPageRenderOptions } from "./page-render-options";

export type GamesPageRenderConfigOptions = {
  hasSessionUser: () => boolean;
  renderPageShell: () => string;
  hydrateRoom: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  rememberRoomTitle: (roomId: string, title: string) => void;
  recoverRoomAccess: (roomId: string, signal?: AbortSignal) => Promise<GameRoom | null>;
};

/**
 * Создаёт render-опции страницы игр из route/state/API зависимостей.
 */
export function createGamesPageRenderConfig(options: GamesPageRenderConfigOptions) {
  return createGamesPageRenderOptions({
    hasSessionUser: options.hasSessionUser,
    isCatalogRoute: isGamesCatalogRoute,
    isPublicRoute: isPublicGamesRoute,
    resetGamesState,
    replaceGamesState,
    getRequestedRoomId,
    getRequestedPublicInviteCode,
    renderPageShell: options.renderPageShell,
    getRoom: getGameRoom,
    getPublicRoom: getPublicGameRoom,
    joinRoom: joinGameRoom,
    hydrateRoom: options.hydrateRoom,
    getStoredRoomSnapshot,
    getStoredRoomAccess,
    allowRoomAccessRecovery,
    rememberRoomTitle: options.rememberRoomTitle,
    rememberRoomAccess,
    canRecoverRoomAccess,
    recoverRoomAccess: options.recoverRoomAccess,
    replaceWithGamesMenuRoute,
    getStoredPublicGuestSession: getPublicGameGuestSessionByInvite,
    forgetPublicGuestSession: forgetPublicGameGuestSession,
  });
}
