import type { HandleGamesConfirmModalsClickOptions } from "./types";

/**
 * Проверяет click по кнопке закрытия модалки или по её overlay.
 */
function isModalCloseClick(target: Element, closeSelector: string, modalSelector: string): boolean {
  const modal = target.closest(modalSelector);
  return Boolean(
    target.closest(closeSelector) || (modal instanceof HTMLElement && modal === target),
  );
}

/**
 * Обрабатывает закрытие confirm-модалок комнаты.
 */
export function handleConfirmCloseClick(
  event: Event,
  target: Element,
  options: HandleGamesConfirmModalsClickOptions,
): boolean {
  if (isModalCloseClick(target, "[data-games-disband-close]", "[data-games-disband-modal]")) {
    event.preventDefault();
    options.setGamesState({ disbandConfirmOpen: false });
    return true;
  }

  if (isModalCloseClick(target, "[data-games-kick-close]", "[data-games-kick-modal]")) {
    event.preventDefault();
    options.setGamesState({ kickConfirmProfileId: "" });
    return true;
  }

  if (isModalCloseClick(target, "[data-games-admin-close]", "[data-games-admin-modal]")) {
    event.preventDefault();
    options.setGamesState({ adminConfirmProfileId: "" });
    return true;
  }

  if (isModalCloseClick(target, "[data-games-start-close]", "[data-games-start-modal]")) {
    event.preventDefault();
    options.setGamesState({ startConfirmOpen: false });
    return true;
  }

  if (isModalCloseClick(target, "[data-games-leave-close]", "[data-games-leave-modal]")) {
    event.preventDefault();
    options.setGamesOverlayState({ leaveConfirmOpen: false });
    return true;
  }

  return false;
}
