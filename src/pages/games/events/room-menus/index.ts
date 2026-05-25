import { handleFloatingMenuActionClick } from "./actions";
import { handleRoomSettingsModalClick } from "./settings-modals";
import { handleRoomMenuToggleClick } from "./toggles";
import type { HandleGamesRoomMenusClickOptions } from "./types";

export type { HandleGamesRoomMenusClickOptions } from "./types";

/**
 * Обрабатывает click-события меню комнаты и связанных модалок.
 */
export function handleGamesRoomMenusClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomMenusClickOptions,
): boolean {
  if (handleRoomMenuToggleClick(event, target, options)) return true;
  if (handleFloatingMenuActionClick(event, target, options)) return true;
  return handleRoomSettingsModalClick(event, target, options);
}
