/**
 * Единая привязка DOM-событий страницы игр.
 *
 * Собирает number/input/submit/live/click handlers в одном месте, чтобы
 * page-слой передавал только зависимости и не держал длинную таблицу wiring.
 */
import { bindGamesClickEvents } from "./clicks";
import { getGamesClickEventOptions } from "./bind/click-options";
import { bindGamesFormEvents } from "./bind/form-events";
import type { BindGamesPageEventsOptions, GamesEventsRoot } from "./bind/types";

export type { BindGamesPageEventsOptions, GamesEventsRoot } from "./bind/types";

/**
 * Подключает все события страницы игр к указанному root.
 */
export function bindGamesPageEvents(
  root: GamesEventsRoot,
  options: BindGamesPageEventsOptions,
): void {
  if (root.__gamesBound) return;

  bindGamesFormEvents(root, options);
  bindGamesClickEvents(root, () => getGamesClickEventOptions(root, options));

  root.__gamesBound = true;
}
