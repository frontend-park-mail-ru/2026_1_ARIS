/**
 * Ограничивает число заданным диапазоном.
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Находит DOM-якорь для всплывающего блока.
 */
export function getGamesPopoverAnchor(popover: HTMLElement): HTMLElement | null {
  const anchorId = popover.dataset.gamesPopoverAnchorId;
  if (anchorId) {
    return document.getElementById(anchorId);
  }

  if (popover.classList.contains("games-ready-status__popover")) {
    return popover.closest<HTMLElement>(".games-ready-status__hint");
  }

  if (popover.classList.contains("games-tooltip-anchor__popup")) {
    return popover.closest<HTMLElement>(".games-tooltip-anchor");
  }

  if (popover.classList.contains("games-field-popover")) {
    const parent = popover.parentElement;
    if (!(parent instanceof HTMLElement)) return null;
    return parent.querySelector<HTMLElement>("[data-games-catalog-hint]") ?? parent;
  }

  return popover.parentElement instanceof HTMLElement ? popover.parentElement : null;
}

/**
 * Возвращает область, внутри которой нужно держать подсказку.
 */
export function getGamesPopoverBounds(anchor: HTMLElement): DOMRect {
  const modalBounds = anchor.closest<HTMLElement>(".games-confirm-modal__dialog");
  if (modalBounds) {
    return modalBounds.getBoundingClientRect();
  }

  const contentCardBounds = anchor.closest<HTMLElement>(".content-card");
  if (contentCardBounds) {
    return contentCardBounds.getBoundingClientRect();
  }

  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/**
 * Обновляет CSS-переменные позиции одной подсказки.
 */
export function updateGamesPopoverViewportOffset(popover: HTMLElement): void {
  popover.style.removeProperty("--games-popover-top");
  popover.style.removeProperty("--games-popover-left");
  popover.style.removeProperty("--games-popover-max-width");
  popover.dataset.gamesPopoverPlacement = "";

  if (popover.hidden) return;

  const anchor = getGamesPopoverAnchor(popover);
  if (!anchor) return;

  const safeViewportPadding = 12;
  const safeBoundsPadding = 12;
  const gap = 8;
  const bounds = getGamesPopoverBounds(anchor);
  const anchorRect = anchor.getBoundingClientRect();
  const minLeft = Math.max(safeViewportPadding, bounds.left + safeBoundsPadding);
  const maxRight = Math.min(
    window.innerWidth - safeViewportPadding,
    bounds.right - safeBoundsPadding,
  );
  const availableWidth = Math.max(160, maxRight - minLeft);

  popover.style.setProperty("--games-popover-max-width", `${availableWidth}px`);

  const rect = popover.getBoundingClientRect();
  const popoverWidth = Math.min(rect.width, availableWidth);
  const preferredLeft = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  const left = clampNumber(preferredLeft, minLeft, Math.max(minLeft, maxRight - popoverWidth));

  const minTop = Math.max(safeViewportPadding, bounds.top + safeBoundsPadding);
  const maxBottom = Math.min(
    window.innerHeight - safeViewportPadding,
    bounds.bottom - safeBoundsPadding,
  );
  const preferTop =
    popover.classList.contains("games-ready-status__popover") ||
    popover.classList.contains("games-tooltip-anchor__popup") ||
    popover.classList.contains("games-field-popover--check");
  const canPlaceTop = anchorRect.top - gap - rect.height >= minTop;
  const canPlaceBottom = anchorRect.bottom + gap + rect.height <= maxBottom;
  const placeTop = preferTop ? canPlaceTop || !canPlaceBottom : !(canPlaceBottom || !canPlaceTop);
  const preferredTop = placeTop ? anchorRect.top - rect.height - gap : anchorRect.bottom + gap;
  const top = clampNumber(preferredTop, minTop, Math.max(minTop, maxBottom - rect.height));

  popover.style.setProperty("--games-popover-left", `${Math.round(left)}px`);
  popover.style.setProperty("--games-popover-top", `${Math.round(top)}px`);
  popover.dataset.gamesPopoverPlacement = placeTop ? "top" : "bottom";
}

/**
 * Обновляет позиции всех подсказок внутри root.
 */
export function updateGamesPopoverViewportOffsets(root: Document | HTMLElement): void {
  const selector =
    ".games-ready-status__popover, .games-field-popover:not([hidden]), .games-tooltip-anchor__popup";
  const popovers = new Set<HTMLElement>([
    ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
    ...Array.from(
      document.querySelectorAll<HTMLElement>(".games-field-popover--portal:not([hidden])"),
    ),
  ]);

  popovers.forEach((popover) => {
    updateGamesPopoverViewportOffset(popover);
  });
}

/**
 * Планирует перерасчёт позиций подсказок на следующий animation frame.
 */
export function scheduleGamesPopoverViewportOffsets(root: Document | HTMLElement): void {
  window.requestAnimationFrame(() => {
    updateGamesPopoverViewportOffsets(root);
  });
}
