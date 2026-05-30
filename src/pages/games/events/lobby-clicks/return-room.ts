import type { HandleGamesLobbyClickOptions } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Обрабатывает возврат в комнату из сообщения лобби.
 */
export function handleReturnRoomClick(
  event: Event,
  button: HTMLElement,
  options: HandleGamesLobbyClickOptions,
): boolean {
  event.preventDefault();
  const roomId = button.getAttribute("data-games-return-room") ?? "";
  void options.handleReturnToRoom(roomId).catch(() => {
    options.showAppToast(gameT("common.unexpectedError"));
    options.setGamesState({
      loading: false,
      message: options.getVoluntaryLeaveMessage(),
      messageReturnRoomId: roomId,
      messageReturnRoomLabel:
        options.messageReturnRoomLabel || options.getVoluntaryLeaveReturnLabel(),
      error: "",
      errorTarget: "",
    });
  });
  return true;
}
