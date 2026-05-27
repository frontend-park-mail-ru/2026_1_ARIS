import type { HandleGamesRoomMenusClickOptions } from "../types";
import { gameT } from "../../../shared/i18n";

/**
 * Обрабатывает action названия комнаты из floating menu.
 */
export function handleTitleFloatingMenuAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (action === "title-copy") {
    void options.handleCopyRoomTitle(options.getRoomTitleValue(options.state.room)).catch(() => {
      options.setGamesState({ message: "", error: gameT("copy.roomTitleError") });
    });
    return true;
  }

  if (action === "title-rename") {
    options.setGamesState({
      ...options.closeGamesMenus(),
      renameTitleModalOpen: true,
      message: "",
      error: "",
      errorTarget: "",
    });
    return true;
  }

  return false;
}
