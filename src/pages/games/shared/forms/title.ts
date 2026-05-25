import { gameT } from "../i18n";

/** Показывает ошибку у поля названия комнаты. */
export function setTitleFieldError(input: HTMLInputElement, message: string): void {
  const field = input.closest(".games-field");
  const error = field?.querySelector<HTMLElement>("[data-games-title-error]");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field?.classList.toggle("games-field--invalid", Boolean(message));
  if (error) {
    error.textContent = message;
  }
}

/** Возвращает текст ошибки для поля названия комнаты. */
export function getTitleFieldError(input: HTMLInputElement, validateEmpty = false): string {
  const value = input.value.trim();
  if (!value) {
    return validateEmpty ? gameT("common.roomTitleRequired") : "";
  }
  return "";
}

/** Валидирует название комнаты и синхронизирует DOM-ошибку. */
export function validateTitleField(input: HTMLInputElement, validateEmpty = false): boolean {
  const message = getTitleFieldError(input, validateEmpty);
  setTitleFieldError(input, message);
  return !message;
}
