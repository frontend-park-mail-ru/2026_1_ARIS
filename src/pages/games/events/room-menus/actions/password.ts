import { getPasswordModeFromAction } from "../shared";
import type { HandleGamesRoomMenusClickOptions } from "../types";
import { gameT } from "../../../shared/i18n";

/**
 * Обрабатывает action пароля комнаты из floating menu.
 */
export function handlePasswordFloatingMenuAction(
  action: string,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (action === "password-toggle-visibility") {
    void options.handleShowPassword().catch(() => {
      options.setGamesState({
        ...options.closeGamesMenus(),
        message: "",
        error: gameT("room.passwordDisplayError"),
        errorTarget: "password",
      });
    });
    return true;
  }

  const mode = getPasswordModeFromAction(action);
  if (!mode) return false;

  options.setGamesState({
    ...options.closeGamesMenus(),
    passwordModalMode: mode,
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}
