const gameHintPortalState = new WeakMap<
  HTMLElement,
  { parent: Node; nextSibling: ChildNode | null }
>();

/**
 * Закрывает подсказки каталога игр, кроме переданной кнопки.
 */
export function closeGameCatalogHints(
  root: Document | HTMLElement,
  except?: HTMLButtonElement,
): void {
  root.querySelectorAll<HTMLButtonElement>("[data-games-catalog-hint]").forEach((button) => {
    if (button === except) return;
    button.classList.remove("games-catalog-card__hint-button--open");
    button.setAttribute("aria-expanded", "false");
    const hintId = button.getAttribute("aria-controls");
    const hint = hintId ? getGameHintById(root, hintId) : null;
    if (hint) {
      hideGameHint(hint);
    }
  });
}

/**
 * Возвращает подсказку каталога по id внутри root или document.
 */
export function getGameHintById(root: Document | HTMLElement, hintId: string): HTMLElement | null {
  const escapedId = CSS.escape(hintId);
  return (
    document.querySelector<HTMLElement>(`.games-field-popover--portal#${escapedId}`) ??
    root.querySelector<HTMLElement>(`#${escapedId}`) ??
    document.getElementById(hintId)
  );
}

/**
 * Гарантирует стабильный id для якоря подсказки.
 */
export function ensureGameHintAnchorId(anchor: HTMLElement): string {
  if (!anchor.id) {
    anchor.id = `games-hint-anchor-${Math.random().toString(36).slice(2, 10)}`;
  }
  return anchor.id;
}

/**
 * Переносит подсказку в body, сохраняя место возврата.
 */
export function mountGameHintPortal(hint: HTMLElement, anchor: HTMLElement): void {
  if (!hint.classList.contains("games-field-popover") || hint.parentElement === document.body) {
    return;
  }

  gameHintPortalState.set(hint, {
    parent: hint.parentNode ?? document.body,
    nextSibling: hint.nextSibling,
  });
  hint.dataset.gamesPopoverAnchorId = ensureGameHintAnchorId(anchor);
  hint.classList.add("games-field-popover--portal");
  document.body.appendChild(hint);
}

/**
 * Возвращает portal-подсказку в исходного родителя.
 */
export function unmountGameHintPortal(hint: HTMLElement): void {
  const portalState = gameHintPortalState.get(hint);
  if (!portalState) return;

  hint.classList.remove("games-field-popover--portal");
  hint.removeAttribute("data-games-popover-anchor-id");

  if (portalState.parent.isConnected) {
    portalState.parent.insertBefore(hint, portalState.nextSibling);
  } else {
    hint.remove();
  }
  gameHintPortalState.delete(hint);
}

/**
 * Показывает подсказку и переносит её в portal при поддержке popover.
 */
export function showGameHint(hint: HTMLElement, anchor: HTMLElement): void {
  mountGameHintPortal(hint, anchor);
  hint.hidden = false;
  const popover = hint as HTMLElement & { showPopover?: () => void };
  if (hint.hasAttribute("popover") && typeof popover.showPopover === "function") {
    try {
      popover.showPopover();
    } catch {
      // Браузер мог уже открыть popover; fallback через hidden остаётся источником истины.
    }
  }
}

/**
 * Скрывает подсказку и возвращает её из portal.
 */
export function hideGameHint(hint: HTMLElement): void {
  const popover = hint as HTMLElement & { hidePopover?: () => void };
  if (hint.hasAttribute("popover") && typeof popover.hidePopover === "function") {
    try {
      popover.hidePopover();
    } catch {
      // Игнорируем гонки состояния popover API; hidden=true ниже закрывает fallback.
    }
  }
  hint.hidden = true;
  unmountGameHintPortal(hint);
}
