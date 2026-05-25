import type { HandleGamesRoomMenusClickOptions } from "../types";

/**
 * Обрабатывает action названия комнаты из floating menu.
 */
export function handleTitleFloatingMenuAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (action === "title-copy") {
    void options.handleCopyRoomTitle(options.getRoomTitleValue(options.state.room)).catch(() => {
      options.setGamesState({ message: "", error: "Не удалось скопировать название комнаты." });
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
