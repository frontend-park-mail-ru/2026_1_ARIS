export type GamesNumberFieldEventsRoot = Document | HTMLElement;

export type BindGamesNumberFieldEventsOptions = {
  showRankedLockedCreateFieldError: (target: HTMLInputElement) => boolean;
  setNumericFieldError: (target: HTMLInputElement, message: string) => void;
  getInvalidNumberMessage: (target: HTMLInputElement) => string;
};

/**
 * Проверяет, что событие относится к числовому полю игр.
 */
function getGamesNumberFieldTarget(event: Event): HTMLInputElement | null {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return null;
  if (!target.matches("[data-games-number-field]")) return null;
  return target;
}

/**
 * Блокирует ввод нечисловых символов в числовые поля игр.
 */
function handleGamesNumberFieldBeforeInput(
  event: Event,
  options: BindGamesNumberFieldEventsOptions,
): void {
  const inputEvent = event as InputEvent;
  const target = getGamesNumberFieldTarget(inputEvent);
  if (!target) return;

  if (options.showRankedLockedCreateFieldError(target)) {
    event.preventDefault();
    return;
  }

  if (inputEvent.data && /\D/.test(inputEvent.data)) {
    event.preventDefault();
    options.setNumericFieldError(target, options.getInvalidNumberMessage(target));
  }
}

/**
 * Блокирует вставку нечислового текста в числовые поля игр.
 */
function handleGamesNumberFieldPaste(
  event: Event,
  options: BindGamesNumberFieldEventsOptions,
): void {
  const pasteEvent = event as ClipboardEvent;
  const target = getGamesNumberFieldTarget(pasteEvent);
  if (!target) return;

  if (options.showRankedLockedCreateFieldError(target)) {
    event.preventDefault();
    return;
  }

  const text = pasteEvent.clipboardData?.getData("text") ?? "";
  if (text && /\D/.test(text)) {
    event.preventDefault();
    options.setNumericFieldError(target, options.getInvalidNumberMessage(target));
  }
}

/**
 * Показывает ranked-lock ошибку при фокусе на числовом поле.
 */
function handleGamesNumberFieldFocus(
  event: Event,
  options: BindGamesNumberFieldEventsOptions,
): void {
  const target = getGamesNumberFieldTarget(event);
  if (!target) return;
  options.showRankedLockedCreateFieldError(target);
}

/**
 * Подключает DOM-события числовых полей страницы игр.
 */
export function bindGamesNumberFieldEvents(
  root: GamesNumberFieldEventsRoot,
  options: BindGamesNumberFieldEventsOptions,
): void {
  root.addEventListener("beforeinput", (event: Event) => {
    handleGamesNumberFieldBeforeInput(event, options);
  });
  root.addEventListener("paste", (event: Event) => {
    handleGamesNumberFieldPaste(event, options);
  });
  root.addEventListener("focusin", (event: Event) => {
    handleGamesNumberFieldFocus(event, options);
  });
}
