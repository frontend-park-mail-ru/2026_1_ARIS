import type { HandleGamesLobbyClickOptions } from "./types";

/**
 * Обрабатывает переключение автообновления комнат.
 */
export function handleRoomsAutoRefreshClick(
  event: Event,
  button: HTMLElement,
  options: HandleGamesLobbyClickOptions,
): boolean {
  event.preventDefault();
  const enabled = button.getAttribute("data-games-rooms-auto-refresh") === "true";
  if (enabled === options.roomsAutoRefreshEnabled) return true;

  options.setGamesState({
    roomsAutoRefreshEnabled: enabled,
    message: "",
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  });
  if (enabled) {
    void options.loadWaitingRooms({ silent: true, preserveMessage: true });
  }
  return true;
}
