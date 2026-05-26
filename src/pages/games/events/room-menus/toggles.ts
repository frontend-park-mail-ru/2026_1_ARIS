import type { HandleGamesRoomMenusClickOptions } from "./types";

/**
 * Синхронизирует aria-expanded у кнопок меню без пересборки основного контента.
 */
function syncQuestionMenuToggleState(
  toggle: HTMLElement,
  questionKey: string,
  isOpen: boolean,
): void {
  toggle.ownerDocument
    .querySelectorAll<HTMLElement>("[data-games-question-menu-toggle]")
    .forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        button.getAttribute("data-games-question-menu-toggle") === questionKey && isOpen
          ? "true"
          : "false",
      );
    });
}

/**
 * Обрабатывает player menu toggle.
 */
function handlePlayerMenuToggleClick(
  event: Event,
  toggle: HTMLElement,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  event.preventDefault();
  const profileId = toggle.getAttribute("data-games-player-menu-toggle") ?? "";
  options.setGamesOverlayState({
    playerMenuProfileId: options.state.playerMenuProfileId === profileId ? "" : profileId,
    ...options.getFloatingMenuAnchor(toggle),
    questionMenuKey: "",
    titleMenuOpen: false,
    passwordMenuOpen: false,
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}

/**
 * Обрабатывает question menu toggle.
 */
function handleQuestionMenuToggleClick(
  event: Event,
  toggle: HTMLElement,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  event.preventDefault();
  const questionKey = toggle.getAttribute("data-games-question-menu-toggle") ?? "";
  if (!questionKey) return true;
  const isOpen = options.state.questionMenuKey !== questionKey;
  syncQuestionMenuToggleState(toggle, questionKey, isOpen);
  options.setGamesOverlayState({
    ...options.getFloatingMenuAnchor(toggle),
    ...options.closeGamesMenus(),
    questionMenuKey: isOpen ? questionKey : "",
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}

/**
 * Обрабатывает title menu toggle.
 */
function handleTitleMenuToggleClick(
  event: Event,
  toggle: HTMLElement,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  event.preventDefault();
  options.setGamesOverlayState({
    ...options.getFloatingMenuAnchor(toggle),
    ...options.closeGamesMenus(),
    titleMenuOpen: !options.state.titleMenuOpen,
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}

/**
 * Обрабатывает password menu toggle.
 */
function handlePasswordMenuToggleClick(
  event: Event,
  toggle: HTMLElement,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  event.preventDefault();
  options.setGamesOverlayState({
    ...options.getFloatingMenuAnchor(toggle),
    ...options.closeGamesMenus(),
    passwordMenuOpen: !options.state.passwordMenuOpen,
    message: "",
    error: "",
    errorTarget: "",
  });
  return true;
}

/**
 * Обрабатывает toggle-кнопки floating menu.
 */
export function handleRoomMenuToggleClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  const playerMenuToggle = target.closest("[data-games-player-menu-toggle]");
  if (playerMenuToggle instanceof HTMLElement) {
    return handlePlayerMenuToggleClick(event, playerMenuToggle, options);
  }

  const questionMenuToggle = target.closest("[data-games-question-menu-toggle]");
  if (questionMenuToggle instanceof HTMLElement) {
    return handleQuestionMenuToggleClick(event, questionMenuToggle, options);
  }

  const titleMenuToggle = target.closest("[data-games-title-menu-toggle]");
  if (titleMenuToggle instanceof HTMLElement) {
    return handleTitleMenuToggleClick(event, titleMenuToggle, options);
  }

  const passwordMenuToggle = target.closest("[data-games-password-menu-toggle]");
  if (passwordMenuToggle instanceof HTMLElement) {
    return handlePasswordMenuToggleClick(event, passwordMenuToggle, options);
  }

  return false;
}
