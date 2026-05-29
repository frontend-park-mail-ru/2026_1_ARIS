import { gameT } from "../i18n";
import { setNumericFieldError, validateNumericField } from "./numeric";
import { validateTitleField } from "./title";

/** Валидирует форму создания комнаты и фокусирует первое невалидное поле. */
export function validateCreateRoomForm(form: HTMLFormElement): boolean {
  applyCreateRoomRankedRules(form);
  let firstInvalid: HTMLInputElement | null = null;

  const titleInput = form.elements.namedItem("title");
  if (titleInput instanceof HTMLInputElement && !validateTitleField(titleInput, true)) {
    firstInvalid = titleInput;
  }

  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("[data-games-number-field]"));
  for (const input of inputs) {
    if (!validateNumericField(input, true) && !firstInvalid) {
      firstInvalid = input;
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
  }
  return !firstInvalid;
}

/** Проверяет, выбран ли рейтинговый режим в форме создания комнаты. */
export function isCreateRoomRanked(form: HTMLFormElement): boolean {
  const input = form.elements.namedItem("isRanked");
  if (input instanceof RadioNodeList) {
    return input.value === "true";
  }
  return input instanceof HTMLInputElement && input.checked;
}

/** Проверяет, заблокировано ли поле настройками рейтинговой комнаты. */
export function isRankedLockedCreateInput(input: HTMLInputElement): boolean {
  if (!input.closest("[data-games-create-room]")) return false;
  return (
    input.name === "questionCount" ||
    input.name === "answerTimeoutSec" ||
    input.name === "roundPauseSec"
  );
}

/** Возвращает фиксированное значение поля для рейтинговой комнаты. */
export function getRankedLockedCreateValue(input: HTMLInputElement): string {
  if (input.name === "questionCount") return "10";
  if (input.name === "answerTimeoutSec") return "10";
  if (input.name === "roundPauseSec") return "5";
  return input.value;
}

/** Применяет ограничения рейтинговой комнаты к форме создания. */
export function applyCreateRoomRankedRules(
  form: HTMLFormElement,
  options: { showLockedErrorFor?: HTMLInputElement | null } = {},
): void {
  const isRanked = isCreateRoomRanked(form);
  const lockedInputs = Array.from(
    form.querySelectorAll<HTMLInputElement>(
      'input[name="questionCount"], input[name="answerTimeoutSec"], input[name="roundPauseSec"]',
    ),
  );

  lockedInputs.forEach((input) => {
    input.readOnly = isRanked;
    input.toggleAttribute("data-games-ranked-locked", isRanked);
    input.setAttribute("aria-readonly", isRanked ? "true" : "false");

    if (isRanked) {
      const rankedLockedMessage = gameT("create.rankedLocked");
      input.value = getRankedLockedCreateValue(input);
      if (options.showLockedErrorFor === input) {
        setNumericFieldError(input, rankedLockedMessage);
      }
      return;
    }

    const field = input.closest(".games-field");
    const error = field?.querySelector<HTMLElement>("[data-games-field-error]");
    if (error?.textContent === gameT("create.rankedLocked")) {
      setNumericFieldError(input, "");
    }
  });
}

/** Показывает ошибку заблокированного рейтингового поля, если ввод запрещён. */
export function showRankedLockedCreateFieldError(input: HTMLInputElement): boolean {
  const form = input.closest<HTMLFormElement>("[data-games-create-room]");
  if (!form || !isRankedLockedCreateInput(input) || !isCreateRoomRanked(form)) return false;
  applyCreateRoomRankedRules(form, { showLockedErrorFor: input });
  return true;
}
