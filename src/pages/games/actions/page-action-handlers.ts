/**
 * Композиция action handlers страницы игр.
 *
 * Собирает room/lobby/profile/live actions вокруг текущего состояния, runtime
 * и сервисов комнаты, чтобы entrypoint не держал длинный wiring действий.
 */
import { createPageLobbyActions } from "./page-action-handlers/lobby";
import { createPageProfileNavigationActions } from "./page-action-handlers/profile";
import { createPageRoomLiveActions } from "./page-action-handlers/room-live";
import { createPageRoomActions } from "./page-action-handlers/room";
import type { GamesPageActionHandlersOptions } from "./page-action-handlers/types";

export type { GamesPageActionHandlersOptions } from "./page-action-handlers/types";
export type GamesPageActionHandlers = ReturnType<typeof createGamesPageActionHandlers>;

/**
 * Создаёт action handlers страницы игр.
 */
export function createGamesPageActionHandlers(options: GamesPageActionHandlersOptions) {
  const lobbyActions = createPageLobbyActions(options);
  const {
    roomUpdateActions,
    roomLifecycleActions,
    roomEntryActions,
    roomSettingsActions,
    roomInteractionActions,
    roomUnavailableActions,
  } = createPageRoomActions(options, lobbyActions);
  const profileNavigationActions = createPageProfileNavigationActions(options);
  const roomLiveActions = createPageRoomLiveActions(options, roomUnavailableActions);

  return {
    ...roomUpdateActions,
    ...roomLifecycleActions,
    ...roomEntryActions,
    ...roomSettingsActions,
    ...roomInteractionActions,
    ...lobbyActions,
    ...roomUnavailableActions,
    ...profileNavigationActions,
    ...roomLiveActions,
  };
}
