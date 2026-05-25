import { handleConfirmActionClick } from "./confirm-modals/actions";
import { handleConfirmCloseClick } from "./confirm-modals/close";
import { handleConfirmOpenClick } from "./confirm-modals/open";
import type { HandleGamesConfirmModalsClickOptions } from "./confirm-modals/types";

export type { HandleGamesConfirmModalsClickOptions } from "./confirm-modals/types";

/**
 * Обрабатывает click-события confirm-модалок игровых комнат.
 */
export function handleGamesConfirmModalsClick(
  event: Event,
  target: Element,
  options: HandleGamesConfirmModalsClickOptions,
): boolean {
  if (handleConfirmOpenClick(event, target, options)) return true;
  if (handleConfirmCloseClick(event, target, options)) return true;
  return handleConfirmActionClick(event, target, options);
}
