import { gameT } from "../i18n";

/** Показывает ошибку у числового поля создания комнаты. */
export function setNumericFieldError(input: HTMLInputElement, message: string): void {
  const field = input.closest(".games-field");
  const error = field?.querySelector<HTMLElement>("[data-games-field-error]");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field?.classList.toggle("games-field--invalid", Boolean(message));
  if (error) {
    error.textContent = message;
  }
}

/** Возвращает текст ошибки для числового поля создания комнаты. */
export function getNumericFieldError(input: HTMLInputElement, validateEmpty = false): string {
  const value = input.value.trim();
  if (!value) {
    return validateEmpty
      ? (input.dataset.gamesNumberInvalidMessage ?? gameT("common.invalidNumber"))
      : "";
  }

  if (!/^\d+$/.test(value)) {
    return input.dataset.gamesNumberInvalidMessage ?? gameT("common.invalidNumber");
  }

  const numberValue = Number(value);
  const min = Number(input.dataset.gamesNumberMin);
  const max = Number(input.dataset.gamesNumberMax);

  if (Number.isFinite(min) && numberValue < min) {
    return input.dataset.gamesNumberMinMessage ?? gameT("common.minValue", { value: min });
  }

  if (Number.isFinite(max) && numberValue > max) {
    return input.dataset.gamesNumberMaxMessage ?? gameT("common.maxValue", { value: max });
  }

  return "";
}

/** Валидирует числовое поле создания комнаты и синхронизирует DOM-ошибку. */
export function validateNumericField(input: HTMLInputElement, validateEmpty = false): boolean {
  const message = getNumericFieldError(input, validateEmpty);
  setNumericFieldError(input, message);
  return !message;
}
