import type { GameRoom } from "../../../api/games";
import type { StoredGameRoomAccess } from "../room/access";
import type { GamesPageState } from "../state/store";
import { loadInitialGamesState } from "./initial-state";

export type RenderGamesPageOptions = {
  hasSessionUser: () => boolean;
  renderGuestPage: (signal?: AbortSignal) => Promise<string>;
  isCatalogRoute: () => boolean;
  resetGamesState: () => void;
  replaceGamesState: (state: GamesPageState) => void;
  getRequestedRoomId: (params?: Record<string, string>) => string;
  renderPageShell: () => string;
  getRoom: (roomId: string, signal?: AbortSignal) => Promise<GameRoom>;
  joinRoom: (payload: {
    roomId?: string;
    inviteCode?: string;
    password?: string;
  }) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  getStoredRoomSnapshot: (roomId: string) => GameRoom | null;
  getStoredRoomAccess: (roomId: string) => StoredGameRoomAccess | null;
  allowRoomAccessRecovery: (roomId: string) => void;
  rememberRoomTitle: (roomId: string, title: string) => void;
  rememberRoomAccess: (room: GameRoom) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string, signal?: AbortSignal) => Promise<GameRoom | null>;
  replaceWithGamesMenuRoute: () => void;
};

/**
 * Рендерит страницу игр с начальной загрузкой состояния текущего route.
 */
export async function renderGamesPage(
  params: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
  options: RenderGamesPageOptions,
): Promise<string> {
  if (!options.hasSessionUser()) {
    return options.renderGuestPage(signal);
  }

  if (options.isCatalogRoute()) {
    options.resetGamesState();
  } else {
    options.replaceGamesState(
      await loadInitialGamesState(options.getRequestedRoomId(params), signal, {
        getRoom: options.getRoom,
        joinRoom: options.joinRoom,
        hydrateRoom: options.hydrateRoom,
        getStoredRoomSnapshot: options.getStoredRoomSnapshot,
        getStoredRoomAccess: options.getStoredRoomAccess,
        allowRoomAccessRecovery: options.allowRoomAccessRecovery,
        rememberRoomTitle: options.rememberRoomTitle,
        rememberRoomAccess: options.rememberRoomAccess,
        canRecoverRoomAccess: options.canRecoverRoomAccess,
        recoverRoomAccess: options.recoverRoomAccess,
        replaceWithGamesMenuRoute: options.replaceWithGamesMenuRoute,
      }),
    );
  }

  return options.renderPageShell();
}
