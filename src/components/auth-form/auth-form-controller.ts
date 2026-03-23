import {
  ApiError,
  loginUser,
  registerUser,
  validateRegisterStepOne,
} from "../../api/auth";
import { setSessionUser } from "../../state/session";
import { closeAuthModal } from "../auth-modal/auth-modal-controller";
import { renderAuthForm } from "./auth-form";
import {
  registerDraft,
  resetRegisterDraft,
  type RegisterStep,
  type RegisterValues,
} from "../../state/register-draft";

type AuthMode = "login" | "register";

const FIELD_ORDER = [
  "firstName",
  "lastName",
  "gender",
  "birthDate",
  "login",
  "password",
  "repeatPassword",
] as const;

type ValidationErrors = Record<FieldName, string>;

type ServerFieldErrors = Partial<Record<"login" | "password1" | "password2", string>>;

type FieldName = (typeof FIELD_ORDER)[number];

const REGISTER_STEP_FIELDS: Record<RegisterStep, readonly FieldName[]> = {
  1: ["login", "password", "repeatPassword"],
  2: ["firstName", "lastName", "gender", "birthDate"],
};

const EMPTY_VALIDATION_ERRORS: ValidationErrors = {
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  login: "",
  password: "",
  repeatPassword: "",
};

/**
 * Extracts and normalizes auth form values.
 *
 * @param {HTMLFormElement} form
 * @returns {Partial<RegisterValues>}
 */
function getFormValues(form: HTMLFormElement): Partial<RegisterValues> {
  const result: Partial<RegisterValues> = {};

  FIELD_ORDER.forEach((name) => {
    const field = form.querySelector(`.input__field[name="${name}"]`);

    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      result[name] = field.value.trim();
    }
  });

  return result;
}

/**
 * Returns current register step from auth form dataset.
 *
 * @param {HTMLElement} authForm
 * @returns {RegisterStep}
 */
function getRegisterStep(authForm: HTMLElement): RegisterStep {
  const step = Number(authForm.dataset.registerStep || "1");
  return step === 2 ? 2 : 1;
}

/**
 * Returns register fields visible on the specified step.
 *
 * @param {RegisterStep} step
 * @returns {FieldName[]}
 */
function getRegisterStepFields(step: RegisterStep): readonly FieldName[] {
  return REGISTER_STEP_FIELDS[step];
}

/**
 * Returns merged register values from draft and current form.
 *
 * @param {HTMLFormElement} form
 * @returns {RegisterValues}
 */
function getRegisterValues(form: HTMLFormElement): RegisterValues {
  return {
    ...registerDraft.values,
    ...getFormValues(form),
  };
}

/**
 * Saves current form values into register draft.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function syncRegisterDraft(form: HTMLFormElement): void {
  registerDraft.values = getRegisterValues(form);
}

/**
 * Returns touched field names stored in form dataset.
 *
 * @param {HTMLFormElement} form
 * @returns {string[]}
 */
function getTouchedFields(form: HTMLFormElement): string[] {
  try {
    return JSON.parse(form.dataset.touchedFields || "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * Marks login field as touched.
 *
 * @param {HTMLFormElement} form
 * @param {string} fieldName
 * @returns {void}
 */
function setTouchedField(form: HTMLFormElement, fieldName: string): void {
  const touched = new Set(getTouchedFields(form));
  touched.add(fieldName);
  form.dataset.touchedFields = JSON.stringify([...touched]);
}

/**
 * Marks register field as touched.
 *
 * @param {string} fieldName
 * @returns {void}
 */
function setRegisterTouchedField(fieldName: string): void {
  const touched = new Set(registerDraft.touchedFields);
  touched.add(fieldName);
  registerDraft.touchedFields = [...touched];
}

/**
 * Writes current register draft state into form dataset.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function syncRegisterFormDataset(form: HTMLFormElement): void {
  form.dataset.touchedFields = JSON.stringify(registerDraft.touchedFields);
  form.dataset.submitAttempted = registerDraft.submitAttempted ? "true" : "false";
}

/**
 * Returns auth form context.
 *
 * @param {HTMLElement} authForm
 * @returns {"modal"|"page"}
 */
function getAuthFormContext(authForm: HTMLElement): "modal" | "page" {
  return authForm.closest(".auth-modal") ? "modal" : "page";
}

/**
 * Rerenders register form in place preserving draft values and touched state.
 *
 * @param {HTMLElement} authForm
 * @returns {HTMLFormElement|null}
 */
function rerenderRegisterForm(authForm: HTMLElement): HTMLFormElement | null {
  const context = getAuthFormContext(authForm);
  const template = document.createElement("template");

  template.innerHTML = renderAuthForm({
    mode: "register",
    context,
    registerStep: registerDraft.step,
    registerValues: registerDraft.values,
  }).trim();

  const newAuthForm = template.content.firstElementChild;
  if (!(newAuthForm instanceof HTMLElement)) {
    return null;
  }

  authForm.replaceWith(newAuthForm);

  const newForm = newAuthForm.querySelector(".auth-form__form");
  if (!(newForm instanceof HTMLFormElement)) {
    return null;
  }

  syncRegisterFormDataset(newForm);

  requestAnimationFrame(() => {
    const firstField = newForm.querySelector(".input__field");
    if (firstField instanceof HTMLElement) {
      firstField.focus();
    }
  });

  return newForm;
}

/**
 * Checks whether a year is leap.
 *
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Returns number of days in a month.
 *
 * @param {number} month
 * @param {number} year
 * @returns {number}
 */
function getDaysInMonth(month: number, year: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 31;
}

/**
 * Normalizes a name to Capitalized format.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeName(value: string): string {
  if (!value) return value;

  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Detects alphabet used in a string.
 *
 * @param {string} value
 * @returns {"latin"|"cyrillic"|null}
 */
function detectAlphabet(value: string): "latin" | "cyrillic" | null {
  if (/^[A-Za-z-]+$/.test(value)) {
    return "latin";
  }

  if (/^[А-Яа-яЁё-]+$/u.test(value)) {
    return "cyrillic";
  }

  return null;
}

/**
 * Validates first name or last name field.
 *
 * @param {string} value
 * @param {string} label
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validateName(value: string, label: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.length > 12) {
    return `${label} может содержать максимум 12 символов`;
  }

  if (/\d/.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть цифр`;
  }

  if (!/^[A-Za-zА-Яа-яЁё-]+$/u.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть символов`;
  }

  const hasLatin = /[A-Za-z]/.test(value);
  const hasCyrillic = /[А-Яа-яЁё]/u.test(value);

  if (hasLatin && hasCyrillic) {
    return "В этом поле нельзя смешивать русский и английский языки";
  }

  return "";
}

/**
 * Validates that first and last names use the same alphabet.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
function validateAlphabetConsistency(firstName: string, lastName: string): string {
  if (!firstName || !lastName) {
    return "";
  }

  const firstLang = detectAlphabet(firstName);
  const lastLang = detectAlphabet(lastName);

  if (!firstLang || !lastLang) {
    return "";
  }

  if (firstLang !== lastLang) {
    return "Имя и фамилия должны быть на одном языке";
  }

  return "";
}

/**
 * Validates birth date field.
 *
 * @param {string} value
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validateBirthDate(value: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (!/^[\d/]*$/.test(value)) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const parts = value.split("/");

  if (parts.length > 3) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const [dayString = "", monthString = "", yearString = ""] = parts;

  if (dayString.length > 2 || monthString.length > 2 || yearString.length > 4) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  if (dayString.length === 2) {
    const day = Number(dayString);

    if (day < 1 || day > 31) {
      return "Некорректный день";
    }
  }

  if (monthString.length === 2) {
    const month = Number(monthString);

    if (month < 1 || month > 12) {
      return "Некорректный месяц";
    }
  }

  if (dayString.length === 2 && monthString.length === 2) {
    const day = Number(dayString);
    const month = Number(monthString);

    const maxDaysWithoutYear: Record<number, number> = {
      1: 31,
      2: 29,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31,
    };

    const maxDay = maxDaysWithoutYear[month];

    if (month >= 1 && month <= 12 && maxDay && day > maxDay) {
      if (month === 2) {
        return "В феврале максимум 29 дней";
      }

      return `В этом месяце ${maxDay} дней`;
    }
  }

  if (yearString.length === 4) {
    const year = Number(yearString);
    const now = new Date();

    if (year > now.getFullYear()) {
      return "Некорректный год";
    }
  }

  if (yearString.length > 0 && yearString.length < 4) {
    return "Введите год в формате гггг";
  }

  if (value.length < 10) {
    return isSubmitAttempted ? "Введите дату рождения в формате дд/мм/гггг" : "";
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);

  const maxDay = getDaysInMonth(month, year);

  if (day > maxDay) {
    if (month === 2) {
      return `В феврале ${year} года ${maxDay} дней`;
    }

    return `В этом месяце ${maxDay} дней`;
  }

  const birthDate = new Date(year, month - 1, day);
  const now = new Date();

  if (birthDate > now) {
    return "Дата рождения не может быть в будущем";
  }

  const ageLimit = new Date(year + 12, month - 1, day);

  if (ageLimit > now) {
    return "Вам должно быть не меньше 12 лет";
  }

  const maxAgeLimit = new Date(year + 130, month - 1, day);

  if (maxAgeLimit < now) {
    return "Возраст не может превышать 130 лет";
  }

  return "";
}

/**
 * Validates gender field.
 *
 * @param {string} value
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validateGender(value: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Выберите пол" : "";
  }

  return "";
}

/**
 * Validates login field.
 *
 * @param {string} value
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validateLogin(value: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.includes(" ")) {
    return "В логине не должно быть пробелов";
  }

  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    return "В логине могут быть только латинские буквы и цифры";
  }

  if (value.length < 6) {
    return "Логин слишком короткий (мин. 6 символов)";
  }

  if (value.length > 12) {
    return "Логин может содержать максимум 12 символов";
  }

  return "";
}

/**
 * Validates password field.
 *
 * @param {string} value
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validatePassword(value: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.length < 7) {
    return "Пароль слишком короткий (мин. 7 символов)";
  }

  if (value.length > 20) {
    return "Пароль может содержать максимум 20 символов";
  }

  return "";
}

/**
 * Validates repeated password field.
 *
 * @param {string} password
 * @param {string} repeatPassword
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {string}
 */
function validateRepeatPassword(
  password: string,
  repeatPassword: string,
  isSubmitAttempted = false,
): string {
  if (!repeatPassword) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (password !== repeatPassword) {
    return "Пароли не совпадают";
  }

  return "";
}

/**
 * Validates register form values.
 *
 * @param {RegisterValues} values
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {ValidationErrors}
 */
function validateRegisterForm(values: RegisterValues, isSubmitAttempted = false): ValidationErrors {
  const errors: ValidationErrors = {
    ...EMPTY_VALIDATION_ERRORS,
    firstName: validateName(values.firstName, "Имя", isSubmitAttempted),
    lastName: validateName(values.lastName, "Фамилия", isSubmitAttempted),
    gender: validateGender(values.gender, isSubmitAttempted),
    birthDate: validateBirthDate(values.birthDate, isSubmitAttempted),
    login: validateLogin(values.login, isSubmitAttempted),
    password: validatePassword(values.password, isSubmitAttempted),
    repeatPassword: validateRepeatPassword(
      values.password,
      values.repeatPassword,
      isSubmitAttempted,
    ),
  };

  const alphabetError = validateAlphabetConsistency(values.firstName, values.lastName);

  if (alphabetError && !errors.firstName && !errors.lastName) {
    errors.lastName = alphabetError;
  }

  return errors;
}

/**
 * Returns validation errors only for current register step.
 *
 * @param {RegisterValues} values
 * @param {RegisterStep} step
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {ValidationErrors}
 */
function validateRegisterStep(
  values: RegisterValues,
  step: RegisterStep,
  isSubmitAttempted = false,
): ValidationErrors {
  const stepFields = getRegisterStepFields(step);
  const allErrors = validateRegisterForm(values, isSubmitAttempted);
  const stepErrors: ValidationErrors = { ...EMPTY_VALIDATION_ERRORS };

  stepFields.forEach((fieldName) => {
    stepErrors[fieldName] = allErrors[fieldName];
  });

  return stepErrors;
}

/**
 * Validates login form values.
 *
 * @param {Partial<RegisterValues>} values
 * @param {boolean} [isSubmitAttempted=false]
 * @returns {ValidationErrors}
 */
function validateLoginForm(
  values: Partial<RegisterValues>,
  isSubmitAttempted = false,
): ValidationErrors {
  return {
    ...EMPTY_VALIDATION_ERRORS,
    login: values.login ? "" : isSubmitAttempted ? "Обязательное поле" : "",
    password: values.password ? "" : isSubmitAttempted ? "Обязательное поле" : "",
  };
}

/**
 * Returns validation errors for current auth mode.
 *
 * @param {"login"|"register"} mode
 * @param {RegisterValues | Partial<RegisterValues>} values
 * @param {boolean} [isSubmitAttempted=false]
 * @param {RegisterStep} [registerStep=1]
 * @returns {ValidationErrors}
 */
function getValidationErrors(
  mode: AuthMode,
  values: RegisterValues | Partial<RegisterValues>,
  isSubmitAttempted = false,
  registerStep: RegisterStep = 1,
): ValidationErrors {
  if (mode === "register") {
    return validateRegisterStep(values as RegisterValues, registerStep, isSubmitAttempted);
  }

  return validateLoginForm(values, isSubmitAttempted);
}

/**
 * Returns field group element by field name.
 *
 * @param {HTMLFormElement} form
 * @param {string} name
 * @returns {Element|null}
 */
function getFieldGroup(form: HTMLFormElement, name: string): Element | null {
  const field = form.querySelector(`.input__field[name="${name}"]`);

  if (!(field instanceof HTMLElement)) {
    return null;
  }

  return field.closest(".auth-form__field-group");
}

/**
 * Clears field-level error state for all fields.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function clearFieldState(form: HTMLFormElement): void {
  FIELD_ORDER.forEach((name) => {
    const group = getFieldGroup(form, name);
    if (!group) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = " ";
      errorNode.classList.add("auth-form__field-error--hidden");
    }

    if (inputWrapper) {
      inputWrapper.classList.remove("input--error");
    }
  });
}

/**
 * Clears form-level error message.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function clearFormError(form: HTMLFormElement): void {
  const errorNode = form.querySelector(".auth-form__error");
  if (!errorNode) return;

  errorNode.textContent = " ";
  errorNode.classList.add("auth-form__error--hidden");
}

/**
 * Shows form-level error message.
 *
 * @param {HTMLFormElement} form
 * @param {string} message
 * @returns {void}
 */
function showFormError(form: HTMLFormElement, message: string): void {
  const errorNode = form.querySelector(".auth-form__error");
  if (!errorNode) return;

  errorNode.textContent = message ?? "";
  errorNode.classList.remove("auth-form__error--hidden");
}

/**
 * Marks selected fields as invalid.
 *
 * @param {HTMLFormElement} form
 * @param {string[]} fieldNames
 * @returns {void}
 */
function markFieldsAsError(form: HTMLFormElement, fieldNames: string[]): void {
  fieldNames.forEach((name) => {
    const group = getFieldGroup(form, name);
    if (!group) return;

    const inputWrapper = group.querySelector(".input");
    if (inputWrapper) {
      inputWrapper.classList.add("input--error");
    }
  });
}

/**
 * Renders server-side field errors for visible fields.
 *
 * @param {HTMLFormElement} form
 * @param {Partial<Record<FieldName, string>>} errorsByField
 * @returns {void}
 */
function renderServerFieldErrors(
  form: HTMLFormElement,
  errorsByField: Partial<Record<FieldName, string>>,
): void {
  clearFieldState(form);

  Object.entries(errorsByField).forEach(([name, message]) => {
    if (!message) return;

    const group = getFieldGroup(form, name);
    if (!group) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = message ?? "";
      errorNode.classList.remove("auth-form__field-error--hidden");
    }

    if (inputWrapper) {
      inputWrapper.classList.add("input--error");
    }
  });
}

/**
 * Returns touched fields for current mode.
 *
 * @param {HTMLFormElement} form
 * @param {"login"|"register"} mode
 * @returns {string[]}
 */
function getActiveTouchedFields(form: HTMLFormElement, mode: AuthMode): string[] {
  return mode === "register" ? registerDraft.touchedFields : getTouchedFields(form);
}

/**
 * Renders validation errors only for touched fields.
 *
 * @param {HTMLFormElement} form
 * @param {ValidationErrors} errors
 * @param {"login"|"register"} mode
 * @returns {void}
 */
function renderTouchedFieldErrors(
  form: HTMLFormElement,
  errors: ValidationErrors,
  mode: AuthMode,
): void {
  clearFieldState(form);

  const touchedFields = getActiveTouchedFields(form, mode);
  const isSubmitAttempted =
    mode === "register" ? registerDraft.submitAttempted : form.dataset.submitAttempted === "true";

  touchedFields.forEach((name) => {
    const group = getFieldGroup(form, name);
    if (!group) return;

    const input = form.querySelector(`.input__field[name="${name}"]`);
    const value =
      input instanceof HTMLInputElement || input instanceof HTMLSelectElement
        ? input.value.trim()
        : "";

    const message = errors[name as FieldName];
    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (!isSubmitAttempted && !value && !message) return;

    if (message) {
      if (errorNode) {
        errorNode.textContent = message ?? "";
        errorNode.classList.remove("auth-form__field-error--hidden");
      }

      if (inputWrapper) {
        inputWrapper.classList.add("input--error");
      }

      return;
    }

    if (value) {
      if (errorNode) {
        errorNode.textContent = " ";
        errorNode.classList.add("auth-form__field-error--hidden");
      }

      if (inputWrapper) {
        inputWrapper.classList.remove("input--error");
      }
    }
  });
}

/**
 * Renders validation errors for all visible fields.
 *
 * @param {HTMLFormElement} form
 * @param {ValidationErrors} errors
 * @returns {void}
 */
function renderAllFieldErrors(form: HTMLFormElement, errors: ValidationErrors): void {
  clearFieldState(form);

  FIELD_ORDER.forEach((name) => {
    const message = errors[name];
    if (!message) return;

    const group = getFieldGroup(form, name);
    if (!group) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = message ?? "";
      errorNode.classList.remove("auth-form__field-error--hidden");
    }

    if (inputWrapper) {
      inputWrapper.classList.add("input--error");
    }
  });
}

/**
 * Checks whether error object contains any validation errors.
 *
 * @param {ValidationErrors} errors
 * @returns {boolean}
 */
function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/**
 * Navigates SPA to the given path.
 *
 * @param {string} path
 * @returns {void}
 */
function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Extracts backend validation errors from ApiError.
 *
 * @param {unknown} error
 * @returns {ServerFieldErrors}
 */
function getApiErrorFieldErrors(error: unknown): ServerFieldErrors {
  if (!(error instanceof ApiError)) {
    return {};
  }

  const data = error.data;

  if (
    typeof data === "object" &&
    data !== null &&
    "errors" in data &&
    typeof data.errors === "object" &&
    data.errors !== null
  ) {
    return data.errors as ServerFieldErrors;
  }

  return {};
}

/**
 * Extracts backend error message from ApiError.
 *
 * @param {unknown} error
 * @returns {string}
 */
function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

/**
 * Extracts backend status from ApiError.
 *
 * @param {unknown} error
 * @returns {number|undefined}
 */
function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) {
    return error.status;
  }

  return undefined;
}

/**
 * Handles register next step action.
 *
 * @param {HTMLFormElement} form
 * @param {HTMLElement} authForm
 * @returns {Promise<void>}
 */
async function handleRegisterNext(form: HTMLFormElement, authForm: HTMLElement): Promise<void> {
  syncRegisterDraft(form);
  registerDraft.submitAttempted = true;

  const values = registerDraft.values;
  const errors = validateRegisterStep(values, 1, true);

  if (hasErrors(errors)) {
    syncRegisterFormDataset(form);
    renderAllFieldErrors(form, errors);
    return;
  }

  clearFormError(form);
  clearFieldState(form);

  try {
    const result = await validateRegisterStepOne({
      login: values.login,
      password1: values.password,
      password2: values.repeatPassword,
    });

    const serverErrors = result.errors || {};

    if (Object.keys(serverErrors).length > 0) {
      syncRegisterFormDataset(form);
      renderServerFieldErrors(form, {
        login: serverErrors.login || "",
        password: serverErrors.password1 || "",
        repeatPassword: serverErrors.password2 || "",
      });
      return;
    }
  } catch (error: unknown) {
    const serverErrors = getApiErrorFieldErrors(error);

    if (Object.keys(serverErrors).length > 0) {
      syncRegisterFormDataset(form);
      renderServerFieldErrors(form, {
        login: serverErrors.login || "",
        password: serverErrors.password1 || "",
        repeatPassword: serverErrors.password2 || "",
      });
      return;
    }

    if (getApiErrorStatus(error) === 409) {
      syncRegisterFormDataset(form);
      renderServerFieldErrors(form, {
        login: getApiErrorMessage(error) || "Такой логин уже существует",
      });
      return;
    }

    showFormError(form, "Не удалось проверить данные первого шага");
    return;
  }

  registerDraft.step = 2;
  registerDraft.submitAttempted = false;

  const nextForm = rerenderRegisterForm(authForm);
  if (!nextForm) return;

  const stepErrors = validateRegisterStep(registerDraft.values, 2, false);
  renderTouchedFieldErrors(nextForm, stepErrors, "register");
}

/**
 * Handles register previous step action.
 *
 * @param {HTMLFormElement} form
 * @param {HTMLElement} authForm
 * @returns {void}
 */
function handleRegisterPrev(form: HTMLFormElement, authForm: HTMLElement): void {
  syncRegisterDraft(form);
  registerDraft.step = 1;
  registerDraft.submitAttempted = false;

  const prevForm = rerenderRegisterForm(authForm);
  if (!prevForm) return;

  const stepErrors = validateRegisterStep(registerDraft.values, 1, false);
  renderTouchedFieldErrors(prevForm, stepErrors, "register");
}

/**
 * Handles auth form submit.
 *
 * @param {SubmitEvent} event
 * @returns {Promise<void>}
 */
async function handleSubmit(event: SubmitEvent): Promise<void> {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.matches(".auth-form__form")) return;

  event.preventDefault();

  const authForm = form.closest(".auth-form");
  if (!(authForm instanceof HTMLElement)) return;

  const mode = authForm.dataset.mode as AuthMode | undefined;
  if (!mode) return;

  if (mode === "login") {
    const values = getFormValues(form);

    form.dataset.submitAttempted = "true";
    const errors = getValidationErrors(mode, values, true);

    if (hasErrors(errors)) {
      renderAllFieldErrors(form, errors);
      return;
    }

    clearFormError(form);
    clearFieldState(form);

    try {
      const user = await loginUser({
        login: values.login || "",
        password: values.password || "",
      });

      setSessionUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarLink: user.avatarLink || "",
      });

      closeAuthModal();
      navigate("/feed");
    } catch (error: unknown) {
      showFormError(form, "Неверный логин или пароль");
      markFieldsAsError(form, ["login", "password"]);
      console.error("Auth error:", error);
    }

    return;
  }

  syncRegisterDraft(form);
  registerDraft.submitAttempted = true;

  const values = registerDraft.values;
  const currentStep = getRegisterStep(authForm);
  const currentStepErrors = validateRegisterStep(values, currentStep, true);
  const allErrors = validateRegisterForm(values, true);

  if (hasErrors(currentStepErrors)) {
    syncRegisterFormDataset(form);
    renderAllFieldErrors(form, currentStepErrors);
    return;
  }

  const stepOneHasErrors = getRegisterStepFields(1).some((fieldName) => allErrors[fieldName]);
  if (stepOneHasErrors) {
    registerDraft.step = 1;
    registerDraft.submitAttempted = true;

    const stepOneForm = rerenderRegisterForm(authForm);
    if (!stepOneForm) return;

    renderAllFieldErrors(stepOneForm, validateRegisterStep(values, 1, true));
    return;
  }

  clearFormError(form);
  clearFieldState(form);

  try {
    const profile = await registerUser({
      firstName: normalizeName(values.firstName),
      lastName: normalizeName(values.lastName),
      birthday: values.birthDate,
      gender: Number(values.gender),
      login: values.login,
      password1: values.password,
      password2: values.repeatPassword,
    });

    setSessionUser({
      id: profile.id,
      firstName: normalizeName(values.firstName),
      lastName: normalizeName(values.lastName),
      avatarLink: profile.avatarLink || "",
    });

    resetRegisterDraft();
    closeAuthModal();
    navigate("/feed");
  } catch (error: unknown) {
    const message = getApiErrorMessage(error).toLowerCase();

    if (message.includes("login already exists")) {
      registerDraft.step = 1;
      registerDraft.submitAttempted = true;

      const stepOneForm = rerenderRegisterForm(authForm);
      if (!stepOneForm) return;

      const stepErrors = validateRegisterStep(values, 1, true);
      renderAllFieldErrors(stepOneForm, stepErrors);

      const group = getFieldGroup(stepOneForm, "login");
      const errorNode = group?.querySelector(".auth-form__field-error");

      if (errorNode) {
        errorNode.textContent = "Такой логин уже существует";
        errorNode.classList.remove("auth-form__field-error--hidden");
      }

      markFieldsAsError(stepOneForm, ["login"]);
    } else {
      showFormError(form, "Не удалось зарегистрироваться");
    }

    console.error("Auth error:", error);
  }
}

/**
 * Initializes auth form validation and submit handlers.
 *
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initAuthForm(root: Document | HTMLElement = document): void {
  if ((root as typeof root & { __authFormBound?: boolean }).__authFormBound) return;

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const nextButton = target.closest("[data-register-next]");
    if (nextButton) {
      event.preventDefault();

      const form = nextButton.closest(".auth-form__form");
      const authForm = nextButton.closest(".auth-form");

      if (!(form instanceof HTMLFormElement) || !(authForm instanceof HTMLElement)) {
        return;
      }

      handleRegisterNext(form, authForm).catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    const prevButton = target.closest("[data-register-prev]");
    if (prevButton) {
      event.preventDefault();

      const form = prevButton.closest(".auth-form__form");
      const authForm = prevButton.closest(".auth-form");

      if (!(form instanceof HTMLFormElement) || !(authForm instanceof HTMLElement)) {
        return;
      }

      handleRegisterPrev(form, authForm);
    }
  });

  root.addEventListener("focusout", (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const form = target.closest(".auth-form__form");
    if (!(form instanceof HTMLFormElement)) return;

    const authForm = form.closest(".auth-form");
    if (!(authForm instanceof HTMLElement)) return;

    const mode = authForm.dataset.mode as AuthMode | undefined;
    if (!mode) return;

    if (mode === "register") {
      syncRegisterDraft(form);
      setRegisterTouchedField(target.name);
      syncRegisterFormDataset(form);

      const values = registerDraft.values;
      const registerStep = getRegisterStep(authForm);
      const errors = getValidationErrors(mode, values, registerDraft.submitAttempted, registerStep);

      renderTouchedFieldErrors(form, errors, mode);
      clearFormError(form);
      return;
    }

    setTouchedField(form, target.name);

    const isSubmitAttempted = form.dataset.submitAttempted === "true";
    const values = getFormValues(form);
    const errors = getValidationErrors(mode, values, isSubmitAttempted);

    renderTouchedFieldErrors(form, errors, mode);
    clearFormError(form);
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const form = target.closest(".auth-form__form");
    if (!(form instanceof HTMLFormElement)) return;

    const authForm = form.closest(".auth-form");
    if (!(authForm instanceof HTMLElement)) return;

    const mode = authForm.dataset.mode as AuthMode | undefined;
    if (!mode) return;

    if (mode === "register") {
      syncRegisterDraft(form);
      setRegisterTouchedField(target.name);
      syncRegisterFormDataset(form);

      const values = registerDraft.values;
      const registerStep = getRegisterStep(authForm);
      const errors = getValidationErrors(mode, values, registerDraft.submitAttempted, registerStep);

      renderTouchedFieldErrors(form, errors, mode);
      return;
    }

    setTouchedField(form, target.name);

    const isSubmitAttempted = form.dataset.submitAttempted === "true";
    const values = getFormValues(form);
    const errors = getValidationErrors(mode, values, isSubmitAttempted);

    renderTouchedFieldErrors(form, errors, mode);
  });

  root.addEventListener("submit", (event: Event) => {
    handleSubmit(event as SubmitEvent).catch((error: unknown) => {
      console.error(error);
    });
  });

  (root as typeof root & { __authFormBound?: boolean }).__authFormBound = true;
}
