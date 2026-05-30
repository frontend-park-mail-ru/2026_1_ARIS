import { getPasswordModeFromAttribute, isModalCloseClick } from "./shared";
import type { HandleGamesRoomMenusClickOptions } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Обрабатывает открытие rename title модалки.
 */
function handleRenameTitleOpenClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (!target.closest("[data-games-rename-title-open]")) return false;

  event.preventDefault();
  options.setGamesState({
    renameTitleModalOpen: true,
    titleMenuOpen: false,
    passwordMenuOpen: false,
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}

/**
 * Обрабатывает открытие password-модалки комнаты.
 */
function handlePasswordModalOpenClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  const passwordModalButton = target.closest("[data-games-password-modal-open]");
  if (!(passwordModalButton instanceof HTMLElement)) return false;

  event.preventDefault();
  const mode = getPasswordModeFromAttribute(
    passwordModalButton.getAttribute("data-games-password-modal-open"),
  );
  if (mode) {
    options.setGamesState({
      passwordModalMode: mode,
      titleMenuOpen: false,
      passwordMenuOpen: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  }
  return true;
}

/**
 * Обрабатывает показ пароля комнаты.
 */
function handlePasswordShowClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (!target.closest("[data-games-password-show]")) return false;

  event.preventDefault();
  void options.handleShowPassword().catch(() => {
    options.setGamesState({
      passwordMenuOpen: false,
      message: "",
      error: gameT("room.passwordDisplayError"),
      errorTarget: "password",
    });
  });
  return true;
}

/**
 * Обрабатывает закрытие password и rename title модалок.
 */
function handleSettingsModalCloseClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (
    isModalCloseClick(target, "[data-games-password-modal-close]", "[data-games-password-modal]")
  ) {
    event.preventDefault();
    options.setGamesState({ passwordModalMode: "", message: "", error: "", errorTarget: "" });
    return true;
  }

  if (
    isModalCloseClick(target, "[data-games-rename-title-close]", "[data-games-rename-title-modal]")
  ) {
    event.preventDefault();
    options.setGamesState({ renameTitleModalOpen: false, message: "", error: "", errorTarget: "" });
    return true;
  }

  return false;
}

/**
 * Обрабатывает подтверждение удаления пароля комнаты.
 */
function handlePasswordRemoveClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (!target.closest("[data-games-password-remove-confirm]")) return false;

  event.preventDefault();
  void options.handleRemovePassword().catch((error: unknown) => {
    options.setGamesState({
      loading: false,
      message: "",
      error: options.getErrorMessage(error, gameT("room.passwordRemoveError")),
      errorTarget: "password",
    });
  });
  return true;
}

/**
 * Обрабатывает кнопки и overlay password/rename-модалок комнаты.
 */
export function handleRoomSettingsModalClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (handleRenameTitleOpenClick(event, target, options)) return true;
  if (handlePasswordModalOpenClick(event, target, options)) return true;
  if (handlePasswordShowClick(event, target, options)) return true;
  if (handleSettingsModalCloseClick(event, target, options)) return true;
  return handlePasswordRemoveClick(event, target, options);
}
