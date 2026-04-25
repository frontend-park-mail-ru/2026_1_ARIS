import { ApiError, loginUser, registerUser, validateRegisterStepOne } from "../../api/auth";
import { setSessionUser } from "../../state/session";
import { closeAuthModal } from "../auth-modal/auth-modal-controller";
import { renderAuthForm } from "./auth-form";
import {
  registerDraft,
  resetRegisterDraft,
  type RegisterStep,
  type RegisterValues,
} from "../../state/register-draft";
import {
  normalizeName,
  validateAlphabetConsistency,
  validateBirthDate,
  validateName,
} from "../../utils/profile-validation";

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
 * Извлекает и нормализует значения формы авторизации.
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
 * Возвращает текущий шаг регистрации из dataset формы авторизации.
 *
 * @param {HTMLElement} authForm
 * @returns {RegisterStep}
 */
function getRegisterStep(authForm: HTMLElement): RegisterStep {
  const step = Number(authForm.dataset.registerStep || "1");
  return step === 2 ? 2 : 1;
}

/**
 * Возвращает поля регистрации, видимые на указанном шаге.
 *
 * @param {RegisterStep} step
 * @returns {FieldName[]}
 */
function getRegisterStepFields(step: RegisterStep): readonly FieldName[] {
  return REGISTER_STEP_FIELDS[step];
}

/**
 * Возвращает объединённые значения регистрации из черновика и текущей формы.
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
 * Сохраняет текущие значения формы в черновик регистрации.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function syncRegisterDraft(form: HTMLFormElement): void {
  registerDraft.values = getRegisterValues(form);
}

/**
 * Возвращает имена затронутых полей, сохранённые в dataset формы.
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
 * Помечает поле входа как затронутое.
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
 * Помечает поле регистрации как затронутое.
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
 * Записывает текущее состояние черновика регистрации в dataset формы.
 *
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function syncRegisterFormDataset(form: HTMLFormElement): void {
  form.dataset.touchedFields = JSON.stringify(registerDraft.touchedFields);
  form.dataset.submitAttempted = registerDraft.submitAttempted ? "true" : "false";
}

/**
 * Возвращает контекст формы авторизации.
 *
 * @param {HTMLElement} authForm
 * @returns {"modal"|"page"}
 */
function getAuthFormContext(authForm: HTMLElement): "modal" | "page" {
  return authForm.closest(".auth-modal") ? "modal" : "page";
}

/**
 * Перерендеривает форму регистрации на месте, сохраняя значения черновика и состояние затронутых полей.
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
 * Валидирует поле пола.
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
 * Валидирует поле логина.
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
 * Валидирует поле пароля.
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
 * Валидирует поле повторного пароля.
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
 * Валидирует значения формы регистрации.
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
 * Возвращает ошибки валидации только для текущего шага регистрации.
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
 * Валидирует значения формы входа.
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
 * Возвращает ошибки валидации для текущего режима авторизации.
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
 * Возвращает элемент группы поля по имени поля.
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
 * Очищает состояние ошибок на уровне полей для всех полей.
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
 * Очищает сообщение об ошибке уровня формы.
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
 * Показывает сообщение об ошибке уровня формы.
 *
 * @param {HTMLFormElement} form
 * @param {string} message
 * @returns {void}
 */
function showFormError(form: HTMLFormElement, message: string): void {
  const errorNode = form.querySelector(".auth-form__error");
  if (!errorNode) return;

  errorNode.innerHTML = message ?? "";
  errorNode.classList.remove("auth-form__error--hidden");
}

/**
 * Помечает выбранные поля как невалидные.
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
 * Рендерит серверные ошибки полей для видимых полей.
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
 * Возвращает затронутые поля для текущего режима.
 *
 * @param {HTMLFormElement} form
 * @param {"login"|"register"} mode
 * @returns {string[]}
 */
function getActiveTouchedFields(form: HTMLFormElement, mode: AuthMode): string[] {
  return mode === "register" ? registerDraft.touchedFields : getTouchedFields(form);
}

/**
 * Рендерит ошибки валидации только для затронутых полей.
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
 * Рендерит ошибки валидации для всех видимых полей.
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
 * Проверяет, содержит ли объект ошибок какие-либо ошибки валидации.
 *
 * @param {ValidationErrors} errors
 * @returns {boolean}
 */
function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/**
 * Выполняет навигацию SPA по указанному пути.
 *
 * @param {string} path
 * @returns {void}
 */
function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Извлекает ошибки валидации backend из ApiError.
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
 * Извлекает сообщение об ошибке backend из ApiError.
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
 * Извлекает статус backend из ApiError.
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

function isOfflineNetworkError(error: unknown): boolean {
  if (!navigator.onLine || error instanceof TypeError) {
    return true;
  }

  const status = getApiErrorStatus(error);
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = getApiErrorMessage(error).toLowerCase();
  return message.includes("proxy") || message.includes("failed to fetch");
}

/**
 * Обрабатывает переход к следующему шагу регистрации.
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

    // В некоторых ветках backend валидация первого шага пока недоступна.
    if (getApiErrorStatus(error) === 404) {
      registerDraft.step = 2;
      registerDraft.submitAttempted = false;

      const nextForm = rerenderRegisterForm(authForm);
      if (!nextForm) return;

      const stepErrors = validateRegisterStep(registerDraft.values, 2, false);
      renderTouchedFieldErrors(nextForm, stepErrors, "register");
      return;
    }

    showFormError(
      form,
      isOfflineNetworkError(error)
        ? "Нет соединения с интернетом.<br>Регистрация сейчас недоступна."
        : "Не удалось проверить данные первого шага",
    );
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
 * Обрабатывает переход к предыдущему шагу регистрации.
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
 * Обрабатывает отправку формы авторизации.
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

      persistLastKnownLogin(values.login || "");
      setSessionUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        login: values.login || "",
        avatarLink: user.avatarLink || "",
      });

      closeAuthModal();
      navigate("/feed");
    } catch (error: unknown) {
      if (isOfflineNetworkError(error)) {
        showFormError(form, "Нет соединения с интернетом.<br>Авторизация сейчас недоступна.");
      } else {
        showFormError(form, "Неверный логин или пароль");
        markFieldsAsError(form, ["login", "password"]);
      }
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

    persistLastKnownLogin(values.login);
    setSessionUser({
      id: profile.id,
      firstName: normalizeName(values.firstName),
      lastName: normalizeName(values.lastName),
      login: values.login,
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
      showFormError(
        form,
        isOfflineNetworkError(error)
          ? "Нет соединения с интернетом.<br>Регистрация сейчас недоступна."
          : "Не удалось зарегистрироваться",
      );
    }
  }
}

function persistLastKnownLogin(login: string): void {
  try {
    const normalized = login.trim();
    if (!normalized) {
      return;
    }

    localStorage.setItem("arisfront:last-login", normalized);
  } catch {
    // ignore storage errors
  }
}

/**
 * Инициализирует валидацию формы авторизации и обработчики отправки.
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

      void handleRegisterNext(form, authForm);
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
    void handleSubmit(event as SubmitEvent);
  });

  (root as typeof root & { __authFormBound?: boolean }).__authFormBound = true;
}
