import type { GamesPageState } from "../state/store";

export type HandleGamesHintsClickOptions = {
  root: Document | HTMLElement;
  participantsStatusHintOpen: boolean;
  readyStatusHintOpen: boolean;
  closeGameCatalogHints: (root: Document | HTMLElement, exceptButton?: HTMLButtonElement) => void;
  getGameHintById: (root: Document | HTMLElement, hintId: string) => HTMLElement | null;
  hideGameHint: (hint: HTMLElement) => void;
  showGameHint: (hint: HTMLElement, anchor: HTMLElement) => void;
  updateGamesPopoverViewportOffset: (hint: HTMLElement) => void;
  scheduleGamesPopoverViewportOffsets: (root: Document | HTMLElement) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Переключает popover-подсказку каталога или комнаты.
 */
function toggleCatalogHint(
  event: Event,
  hintButton: HTMLButtonElement,
  options: HandleGamesHintsClickOptions,
): void {
  event.preventDefault();
  const willOpen = !hintButton.classList.contains("games-catalog-card__hint-button--open");
  const hintId = hintButton.getAttribute("aria-controls");
  const hint = hintId ? options.getGameHintById(options.root, hintId) : null;
  options.closeGameCatalogHints(options.root, hintButton);
  hintButton.classList.toggle("games-catalog-card__hint-button--open", willOpen);
  hintButton.setAttribute("aria-expanded", String(willOpen));
  if (!hint) return;

  if (willOpen) {
    options.showGameHint(hint, hintButton);
    options.updateGamesPopoverViewportOffset(hint);
    options.scheduleGamesPopoverViewportOffsets(options.root);
    return;
  }

  options.hideGameHint(hint);
}

/**
 * Закрывает статусные подсказки при клике вне них.
 */
function closeStatusHintsOnOutsideClick(
  target: Element,
  options: HandleGamesHintsClickOptions,
): void {
  if (!target.closest("[data-games-participants-status]") && options.participantsStatusHintOpen) {
    options.setGamesState({ participantsStatusHintOpen: false });
  }

  if (!target.closest("[data-games-ready-status]") && options.readyStatusHintOpen) {
    options.setGamesState({ readyStatusHintOpen: false });
  }
}

/**
 * Обрабатывает click-события popover и статусных подсказок.
 */
export function handleGamesHintsClick(
  event: Event,
  target: Element,
  options: HandleGamesHintsClickOptions,
): boolean {
  const hintButton = target.closest("[data-games-catalog-hint]");
  if (hintButton instanceof HTMLButtonElement) {
    toggleCatalogHint(event, hintButton, options);
    return true;
  }

  const participantsStatusButton = target.closest("[data-games-participants-status-toggle]");
  if (participantsStatusButton instanceof HTMLButtonElement) {
    event.preventDefault();
    options.setGamesState({
      participantsStatusHintOpen: !options.participantsStatusHintOpen,
      readyStatusHintOpen: false,
      message: "",
      error: "",
    });
    return true;
  }

  const readyStatusButton = target.closest("[data-games-ready-status-toggle]");
  if (readyStatusButton instanceof HTMLButtonElement) {
    event.preventDefault();
    options.setGamesState({
      participantsStatusHintOpen: false,
      readyStatusHintOpen: !options.readyStatusHintOpen,
      message: "",
      error: "",
    });
    return true;
  }

  options.closeGameCatalogHints(options.root);
  closeStatusHintsOnOutsideClick(target, options);
  return false;
}
