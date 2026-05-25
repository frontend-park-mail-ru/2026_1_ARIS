/**
 * DOM-утилиты всплывающих подсказок страницы игр.
 *
 * Файл оставлен публичным barrel для старых импортов, а реализация разнесена
 * на portal lifecycle и расчёт позиции.
 */
export {
  closeGameCatalogHints,
  ensureGameHintAnchorId,
  getGameHintById,
  hideGameHint,
  mountGameHintPortal,
  showGameHint,
  unmountGameHintPortal,
} from "./popovers/portal";
export {
  clampNumber,
  getGamesPopoverAnchor,
  getGamesPopoverBounds,
  scheduleGamesPopoverViewportOffsets,
  updateGamesPopoverViewportOffset,
  updateGamesPopoverViewportOffsets,
} from "./popovers/position";
