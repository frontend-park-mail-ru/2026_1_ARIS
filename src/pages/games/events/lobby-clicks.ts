import { handleRoomsAutoRefreshClick } from "./lobby-clicks/auto-refresh";
import { handleLobbyModeClick } from "./lobby-clicks/mode";
import { handleReturnRoomClick } from "./lobby-clicks/return-room";
import type { HandleGamesLobbyClickOptions } from "./lobby-clicks/types";

export type { HandleGamesLobbyClickOptions } from "./lobby-clicks/types";

/**
 * Обрабатывает click-события лобби и навигации игр.
 */
export function handleGamesLobbyClick(
  event: Event,
  target: Element,
  options: HandleGamesLobbyClickOptions,
): boolean {
  const lobbyModeButton = target.closest("[data-games-lobby-mode]");
  if (lobbyModeButton instanceof HTMLElement) {
    return handleLobbyModeClick(event, lobbyModeButton, options);
  }

  if (target.closest("[data-games-refresh-rooms]")) {
    event.preventDefault();
    void options.loadWaitingRooms();
    return true;
  }

  if (target.closest("[data-games-refresh-rooms-link]")) {
    event.preventDefault();
    void options.loadWaitingRooms({ preserveMessage: false });
    return true;
  }

  if (target.closest("[data-games-refresh-leaderboard]")) {
    event.preventDefault();
    void options.loadLeaderboard();
    return true;
  }

  if (target.closest("[data-games-back-to-rooms]")) {
    event.preventDefault();
    void options.handleBackToRooms().catch((error: unknown) => {
      options.setGamesState({
        roomsLoading: false,
        message: "",
        messageReturnRoomId: "",
        messageReturnInviteCode: "",
        messageReturnPassword: "",
        error: options.getErrorMessage(error, "Не удалось открыть список комнат."),
      });
    });
    return true;
  }

  const returnToRoomButton = target.closest("[data-games-return-room]");
  if (returnToRoomButton instanceof HTMLElement) {
    return handleReturnRoomClick(event, returnToRoomButton, options);
  }

  const roomsAutoRefreshToggle = target.closest("[data-games-rooms-auto-refresh]");
  if (roomsAutoRefreshToggle instanceof HTMLElement) {
    return handleRoomsAutoRefreshClick(event, roomsAutoRefreshToggle, options);
  }

  return false;
}
