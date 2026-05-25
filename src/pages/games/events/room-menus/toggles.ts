import type { HandleGamesRoomMenusClickOptions } from "./types";

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
  options.setGamesState({
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
  options.setGamesState({
    ...options.getFloatingMenuAnchor(toggle),
    ...options.closeGamesMenus(),
    questionMenuKey: options.state.questionMenuKey === questionKey ? "" : questionKey,
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
  options.setGamesState({
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
  options.setGamesState({
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
