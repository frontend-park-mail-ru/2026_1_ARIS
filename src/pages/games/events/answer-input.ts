export type GamesAnswerInputFocusEventsRoot = Document | HTMLElement;

const ANSWER_START_KEY_RE = /^[0-9.,-]$/;

function getAnswerInput(root: GamesAnswerInputFocusEventsRoot): HTMLInputElement | null {
  const input = root.querySelector<HTMLInputElement>("[data-games-answer-input]");
  if (!input || input.disabled || input.readOnly) return null;
  return input;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function insertAnswerKey(input: HTMLInputElement, key: string): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(key, start, end, "end");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleAnswerInputKeydown(
  event: KeyboardEvent,
  root: GamesAnswerInputFocusEventsRoot,
): void {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!ANSWER_START_KEY_RE.test(event.key)) return;
  if (isEditableTarget(event.target)) return;

  const input = getAnswerInput(root);
  if (!input) return;

  event.preventDefault();
  input.focus({ preventScroll: true });
  insertAnswerKey(input, event.key);
}

/**
 * Позволяет на десктопе сразу начать вводить ответ, даже если браузер не успел
 * поставить фокус в поле после смены вопроса.
 */
export function bindGamesAnswerInputFocusEvents(root: GamesAnswerInputFocusEventsRoot): void {
  root.addEventListener("keydown", (event: Event) => {
    handleAnswerInputKeydown(event as KeyboardEvent, root);
  });
}
