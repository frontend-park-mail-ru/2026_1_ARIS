import type { GamesPageState } from "../state/store";

export type GamesFormFieldEventsRoot = Document | HTMLElement;

export type BindGamesFormFieldEventsOptions = {
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  validateTitleField: (target: HTMLInputElement) => boolean;
  showRankedLockedCreateFieldError: (target: HTMLInputElement) => boolean;
  validateNumericField: (target: HTMLInputElement) => boolean;
  applyCreateRoomRankedRules: (form: HTMLFormElement) => void;
  validateInviteCodeField: (target: HTMLInputElement) => boolean;
  setJoinPasswordFieldError: (target: HTMLInputElement, message: string) => void;
};

/**
 * Сбрасывает визуальное состояние ошибки поля пароля входа.
 */
function resetJoinPasswordFieldError(
  target: HTMLInputElement,
  options: BindGamesFormFieldEventsOptions,
): void {
  options.setJoinPasswordFieldError(target, "");
  const inputWrapper = target.closest<HTMLElement>(".input");
  inputWrapper?.classList.remove("input--error");
  inputWrapper?.classList.add("input--default");
  const modalError = target
    .closest("[data-games-join-password-modal]")
    ?.querySelector<HTMLElement>(".games-join-password-modal__error");
  if (modalError) {
    modalError.textContent = "";
  }
}

/**
 * Применяет ограничения ranked-режима для формы создания комнаты.
 */
function applyRankedCreateRules(
  target: HTMLInputElement,
  options: BindGamesFormFieldEventsOptions,
) {
  const form = target.closest<HTMLFormElement>("[data-games-create-room]");
  if (form) {
    options.applyCreateRoomRankedRules(form);
  }
}

/**
 * Обрабатывает input-события полей формы игр.
 */
function handleGamesFormFieldInput(event: Event, options: BindGamesFormFieldEventsOptions): void {
  const target = event.target;

  if (
    target instanceof HTMLInputElement &&
    target.name === "title" &&
    (target.closest("[data-games-create-room]") || target.closest("[data-games-rename-title-form]"))
  ) {
    options.validateTitleField(target);
    return;
  }

  if (target instanceof HTMLInputElement && target.matches("[data-games-number-field]")) {
    if (options.showRankedLockedCreateFieldError(target)) {
      return;
    }
    options.validateNumericField(target);
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.name === "isRanked" &&
    target.closest("[data-games-create-room]")
  ) {
    applyRankedCreateRules(target, options);
    return;
  }

  if (target instanceof HTMLInputElement && target.matches("[data-games-invite-code-field]")) {
    target.value = target.value.toUpperCase();
    options.patchGamesState({
      joinInviteCodeValue: target.value,
      joinInviteCodeError: "",
      joinPasswordError: "",
    });
    options.validateInviteCodeField(target);
    return;
  }

  if (target instanceof HTMLInputElement && target.matches("[data-games-join-password-field]")) {
    options.patchGamesState({
      joinPasswordValue: target.value,
      joinPasswordError: "",
      error: "",
      errorTarget: "",
    });
    resetJoinPasswordFieldError(target, options);
  }
}

/**
 * Обрабатывает change-события полей формы игр.
 */
function handleGamesFormFieldChange(event: Event, options: BindGamesFormFieldEventsOptions): void {
  const target = event.target;
  if (
    target instanceof HTMLInputElement &&
    target.name === "isRanked" &&
    target.closest("[data-games-create-room]")
  ) {
    applyRankedCreateRules(target, options);
  }
}

/**
 * Подключает DOM-события полей форм страницы игр.
 */
export function bindGamesFormFieldEvents(
  root: GamesFormFieldEventsRoot,
  options: BindGamesFormFieldEventsOptions,
): void {
  root.addEventListener("input", (event: Event) => {
    handleGamesFormFieldInput(event, options);
  });
  root.addEventListener("change", (event: Event) => {
    handleGamesFormFieldChange(event, options);
  });
}
