import { gameT } from "../i18n";

/** Показывает ошибку у поля кода приглашения. */
export function setInviteCodeFieldError(input: HTMLInputElement, message: string): void {
  const field = input.closest(".games-field");
  const error = field?.querySelector<HTMLElement>("[data-games-invite-code-error]");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field?.classList.toggle("games-field--invalid", Boolean(message));
  if (error) {
    error.textContent = message;
  }
}

/** Показывает ошибку у поля пароля при входе в комнату. */
export function setJoinPasswordFieldError(input: HTMLInputElement, message: string): void {
  const field = input.closest(".games-field");
  const error = field?.querySelector<HTMLElement>("[data-games-join-password-error]");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field?.classList.toggle("games-field--invalid", Boolean(message));
  if (error) {
    error.textContent = message;
  }
}

/** Возвращает текст ошибки для кода приглашения. */
export function getInviteCodeFieldError(input: HTMLInputElement, validateEmpty = false): string {
  const value = input.value.trim();
  if (!value) return validateEmpty ? gameT("join.emptyCode") : "";
  if (!/^[A-Za-z0-9]{6}$/.test(value)) return gameT("join.invalidCode");
  return "";
}

/** Валидирует код приглашения и синхронизирует DOM-ошибку. */
export function validateInviteCodeField(input: HTMLInputElement, validateEmpty = false): boolean {
  const message = getInviteCodeFieldError(input, validateEmpty);
  setInviteCodeFieldError(input, message);
  return !message;
}

/** Валидирует форму входа в комнату по коду приглашения. */
export function validateJoinRoomForm(form: HTMLFormElement): boolean {
  const inviteCodeInput = form.elements.namedItem("inviteCode");
  if (
    inviteCodeInput instanceof HTMLInputElement &&
    !validateInviteCodeField(inviteCodeInput, true)
  ) {
    inviteCodeInput.focus();
    return false;
  }
  return true;
}
