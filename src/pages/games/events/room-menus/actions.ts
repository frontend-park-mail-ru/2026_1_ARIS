import { handlePasswordFloatingMenuAction } from "./actions/password";
import { handlePlayerFloatingMenuAction } from "./actions/player";
import { handleQuestionFloatingMenuAction } from "./actions/question";
import { handleTitleFloatingMenuAction } from "./actions/title";
import type { HandleGamesRoomMenusClickOptions } from "./types";

/**
 * Сбрасывает раскрытое состояние кнопок вопроса без пересборки карточки итогов.
 */
function closeQuestionMenuToggleState(target: Element): void {
  target.ownerDocument
    .querySelectorAll<HTMLElement>("[data-games-question-menu-toggle]")
    .forEach((button) => button.setAttribute("aria-expanded", "false"));
}

/**
 * Обрабатывает action-кнопки floating menu.
 */
export function handleFloatingMenuActionClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (target.closest("[data-floating-menu-close]")) {
    event.preventDefault();
    closeQuestionMenuToggleState(target);
    options.setGamesOverlayState({
      ...options.closeGamesMenus(),
      message: "",
      error: "",
      errorTarget: "",
    });
    return true;
  }

  const floatingMenuActionButton = target.closest("[data-floating-menu-action]");
  if (!(floatingMenuActionButton instanceof HTMLElement)) return false;

  event.preventDefault();
  closeQuestionMenuToggleState(target);
  const action = floatingMenuActionButton.getAttribute("data-floating-menu-action") ?? "";
  if (handleQuestionFloatingMenuAction(action, options)) return true;
  if (handleTitleFloatingMenuAction(action, options)) return true;
  if (handlePasswordFloatingMenuAction(action, options)) return true;
  if (handlePlayerFloatingMenuAction(action, options)) return true;
  return true;
}
