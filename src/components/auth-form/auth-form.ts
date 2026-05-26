/**
 * Разметка формы авторизации и регистрации.
 */
import { renderButton } from "../button/button";
import { renderInput } from "../input/input";
import type { RegisterStep, RegisterValues } from "../../state/register-draft";

type AuthMode = "login" | "register";
type AuthContext = "page" | "modal";
type InputState = "default" | "error";

type RenderAuthFieldOptions = {
  type: string;
  name: keyof RegisterValues | "password";
  placeholder: string;
  value?: string;
  state?: InputState;
  withToggle?: boolean;
  isVisible?: boolean;
  errorText?: string;
  attributes?: string;
};

type RenderAuthFormOptions = {
  mode: AuthMode;
  hasError?: boolean;
  errorText?: string;
  context?: AuthContext;
  registerStep?: RegisterStep;
  registerValues?: Partial<RegisterValues>;
};

const DEFAULT_OAUTH_RETURN_TO = "/feed";
const AUTH_PAGE_PATHS = new Set(["/login", "/register"]);

/**
 * Добавляет к пути маркер успешного VK ID callback.
 *
 * @param {string} path Исходный путь возврата.
 * @returns {string} Путь с query-параметром `oauth=vkid`.
 */
function addVkIdSuccessMarker(path: string): string {
  const url = new URL(path, "https://aris.local");
  url.searchParams.set("oauth", "vkid");
  url.searchParams.delete("error");
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Возвращает безопасный путь возврата после VK ID авторизации.
 *
 * @returns {string} Путь, на который backend должен вернуть пользователя после OAuth.
 */
function getCurrentOauthReturnTo(): string {
  if (typeof window === "undefined") {
    return addVkIdSuccessMarker(DEFAULT_OAUTH_RETURN_TO);
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("oauth");
  url.searchParams.delete("error");

  if (AUTH_PAGE_PATHS.has(url.pathname)) {
    return addVkIdSuccessMarker(DEFAULT_OAUTH_RETURN_TO);
  }

  const returnTo = `${url.pathname}${url.search}${url.hash}`;
  return addVkIdSuccessMarker(returnTo || DEFAULT_OAUTH_RETURN_TO);
}

/**
 * Формирует backend-ссылку для старта VK ID авторизации.
 *
 * @returns {string} URL ручки OAuth-логина.
 */
function getVkIdLoginUrl(): string {
  const params = new URLSearchParams({ returnTo: getCurrentOauthReturnTo() });
  return `/api/auth/vkid/login?${params.toString()}`;
}

/**
 * Извлекает человекочитаемое сообщение об ошибке VK ID callback из текущего URL.
 *
 * @returns {string} Текст ошибки или пустая строка.
 */
function getVkIdOauthErrorText(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("oauth") !== "vkid" || !params.has("error")) {
    return "";
  }

  return "Не удалось войти через VK ID. Попробуйте ещё раз.";
}

/**
 * Рендерит блок входа через внешние сервисы.
 *
 * @returns {string} HTML-разметка OAuth-блока.
 */
function renderVkIdAuth(): string {
  return `
    <div class="auth-form__oauth" aria-label="Вход через внешние сервисы">
      <div class="auth-form__oauth-divider">
        <span class="auth-form__oauth-divider-text">или</span>
      </div>

      ${renderButton({
        text: '<span class="auth-form__vkid-mark" aria-hidden="true">VK</span><span>Войти через VK ID</span>',
        variant: "surface",
        tag: "link",
        href: getVkIdLoginUrl(),
        className: "auth-form__oauth-button",
        attributes: 'data-auth-vkid-link rel="nofollow"',
      })}
    </div>
  `;
}

/**
 * Рендерит одно поле формы авторизации с инпутом и областью ошибки.
 *
 * @param {RenderAuthFieldOptions} options Параметры поля.
 * @returns {string} HTML-разметка поля.
 */
function renderAuthField({
  type,
  name,
  placeholder,
  value = "",
  state = "default",
  withToggle = false,
  isVisible = false,
  errorText = "",
  attributes = "",
}: RenderAuthFieldOptions): string {
  const hasError = Boolean(errorText);

  return `
    <div class="auth-form__field-group">
      ${renderInput({
        type,
        name,
        placeholder,
        value,
        state,
        withToggle,
        isVisible,
        className: "auth-form__input-control",
        attributes,
      })}

      <p class="auth-form__field-error${hasError ? "" : " auth-form__field-error--hidden"}">
        ${hasError ? errorText : " "}
      </p>
    </div>
  `;
}

/**
 * Рендерит поля входа.
 *
 * @param {boolean} hasError Нужно ли показать ошибочное состояние полей.
 * @param {Partial<RegisterValues>} [values={}] Текущие значения формы.
 * @returns {string} HTML-разметка полей входа.
 */
function renderLoginFields(hasError: boolean, values: Partial<RegisterValues> = {}): string {
  const state: InputState = hasError ? "error" : "default";

  return `
    ${renderAuthField({
      type: "text",
      name: "login",
      placeholder: "Логин",
      value: values.login || "",
      state,
    })}

    ${renderAuthField({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      value: values.password || "",
      state,
      withToggle: true,
      isVisible: false,
    })}
  `;
}

/**
 * Рендерит поле выбора пола.
 *
 * @param {Partial<RegisterValues>} [values={}] Значения формы регистрации.
 * @returns {string} HTML-разметка select-поля.
 */
function renderGenderField(values: Partial<RegisterValues> = {}): string {
  return `
    <div class="auth-form__field-group">
      <label class="input input--default auth-form__input-control auth-form__select">
        <select class="input__field auth-form__select-field" name="gender" required>
          <option value="" ${!values.gender ? "selected" : ""} disabled hidden>Пол</option>
          <option value="1" ${values.gender === "1" ? "selected" : ""}>Мужской</option>
          <option value="2" ${values.gender === "2" ? "selected" : ""}>Женский</option>
        </select>
      </label>

      <p class="auth-form__field-error auth-form__field-error--hidden"> </p>
    </div>
  `;
}

/**
 * Рендерит прогресс шага регистрации.
 *
 * @param {RegisterStep} step Текущий шаг регистрации.
 * @returns {string} HTML-разметка индикатора прогресса.
 */
function renderRegisterProgress(step: RegisterStep): string {
  return `
    <div class="auth-form__progress" aria-label="Прогресс регистрации">
      <div class="auth-form__progress-item ${step === 1 ? "auth-form__progress-item--active" : "auth-form__progress-item--done"}">
        <span class="auth-form__progress-dot">1</span>
        <span class="auth-form__progress-label">Аккаунт</span>
      </div>

      <div class="auth-form__progress-line"></div>

      <div class="auth-form__progress-item ${step === 2 ? "auth-form__progress-item--active" : ""}">
        <span class="auth-form__progress-dot">2</span>
        <span class="auth-form__progress-label">Профиль</span>
      </div>
    </div>
  `;
}

/**
 * Рендерит поля первого шага регистрации.
 *
 * @param {Partial<RegisterValues>} values Текущие значения формы.
 * @returns {string} HTML-разметка первого шага.
 */
function renderRegisterStepOneFields(values: Partial<RegisterValues> = {}): string {
  return `
    <div class="auth-form__step-grid">
      ${renderAuthField({
        type: "text",
        name: "login",
        placeholder: "Логин",
        value: values.login || "",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "password",
        name: "password",
        placeholder: "Пароль",
        value: values.password || "",
        state: "default",
        withToggle: true,
        isVisible: false,
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "password",
        name: "repeatPassword",
        placeholder: "Повторите пароль",
        value: values.repeatPassword || "",
        state: "default",
        withToggle: true,
        isVisible: false,
        attributes: 'maxlength="20"',
      })}
    </div>
  `;
}

/**
 * Рендерит поля второго шага регистрации.
 *
 * @param {Partial<RegisterValues>} values Текущие значения формы.
 * @returns {string} HTML-разметка второго шага.
 */
function renderRegisterStepTwoFields(values: Partial<RegisterValues> = {}): string {
  return `
    <div class="auth-form__step-grid">
      ${renderAuthField({
        type: "text",
        name: "firstName",
        placeholder: "Имя",
        value: values.firstName || "",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "text",
        name: "lastName",
        placeholder: "Фамилия",
        value: values.lastName || "",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderGenderField(values)}

      ${renderAuthField({
        type: "text",
        name: "birthDate",
        placeholder: "Дата рождения (дд/мм/гггг)",
        value: values.birthDate || "",
        state: "default",
        attributes: 'inputmode="numeric" maxlength="10" data-mask="date"',
      })}
    </div>
  `;
}

/**
 * Рендерит кнопки текущего шага регистрации.
 *
 * @param {RegisterStep} step Текущий шаг регистрации.
 * @returns {string} HTML-разметка действий шага.
 */
function renderRegisterStepActions(step: RegisterStep): string {
  if (step === 1) {
    return `
      <div class="auth-form__step-actions auth-form__step-actions--single">
        ${renderButton({
          text: "Далее",
          variant: "primary",
          tag: "button",
          type: "button",
          className: "auth-form__submit",
          attributes: "data-register-next",
        })}

        ${renderButton({
          text: "Уже есть аккаунт? Войти",
          variant: "neutral",
          tag: "button",
          type: "button",
          className: "auth-form__secondary-link",
          attributes: 'data-switch-auth-mode="login"',
        })}
      </div>
    `;
  }

  return `
    <div class="auth-form__step-actions auth-form__step-actions--single">
      ${renderButton({
        text: "Зарегистрироваться",
        variant: "primary",
        tag: "button",
        type: "submit",
        className: "auth-form__submit",
      })}

      ${renderButton({
        text: "Назад",
        variant: "neutral",
        tag: "button",
        type: "button",
        className: "auth-form__secondary-link",
        attributes: "data-register-prev",
      })}
    </div>
  `;
}

/**
 * Рендерит поля регистрации для текущего шага.
 *
 * @param {RegisterStep} step Текущий шаг регистрации.
 * @param {Partial<RegisterValues>} values Текущие значения формы.
 * @param {boolean} [hasError=false] Нужно ли показать ошибку уровня формы.
 * @param {string} [errorText=" "] Текст ошибки уровня формы.
 * @returns {string} HTML-разметка активного шага регистрации.
 */
function renderRegisterFields(
  step: RegisterStep,
  values: Partial<RegisterValues>,
  hasError = false,
  errorText = " ",
): string {
  return `
    ${renderRegisterProgress(step)}
    ${step === 1 ? renderRegisterStepOneFields(values) : renderRegisterStepTwoFields(values)}
    <p class="auth-form__error${hasError ? "" : " auth-form__error--hidden"}">
      ${hasError ? errorText : " "}
    </p>
    ${renderRegisterStepActions(step)}
  `;
}

/**
 * Рендерит форму авторизации.
 *
 * @param {RenderAuthFormOptions} options Параметры формы.
 * @returns {string} HTML-разметка формы авторизации или регистрации.
 */
export function renderAuthForm({
  mode,
  hasError = false,
  errorText = "Неверный логин или пароль",
  context = "page",
  registerStep = 1,
  registerValues = {},
}: RenderAuthFormOptions): string {
  const isLogin = mode === "login";
  const isModal = context === "modal";
  const isRegisterStepTwo = mode === "register" && registerStep === 2;
  const oauthErrorText = getVkIdOauthErrorText();
  const formHasError = hasError || Boolean(oauthErrorText);
  const formErrorText = oauthErrorText || errorText;

  return `
    <section
      class="auth-form"
      data-mode="${mode}"
      data-context="${context}"
      ${mode === "register" ? `data-register-step="${registerStep}"` : ""}
    >
      <div class="auth-form__header">
        <img class="auth-form__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">

        <div class="auth-form__header-text">
          <h1 class="auth-form__title">
            ${isLogin ? "Вход" : isRegisterStepTwo ? "Завершение регистрации" : "Регистрация"}
          </h1>

          <p class="auth-form__subtitle">
            ${
              isLogin
                ? "Введите логин и пароль"
                : isRegisterStepTwo
                  ? "Ещё немного данных о вас"
                  : "Создайте аккаунт за пару шагов"
            }
          </p>
        </div>
      </div>

      <form class="auth-form__form" novalidate>
        <div class="auth-form__fields">
          ${
            isLogin
              ? renderLoginFields(hasError, registerValues)
              : renderRegisterFields(registerStep, registerValues, formHasError, formErrorText)
          }
        </div>

        ${
          isLogin
            ? `
              <p class="auth-form__error${formHasError ? "" : " auth-form__error--hidden"}">
                ${formHasError ? formErrorText : " "}
              </p>
              <div class="auth-form__actions">
                ${renderButton({
                  text: "Продолжить",
                  variant: "primary",
                  tag: "button",
                  type: "submit",
                  className: "auth-form__submit",
                })}
              </div>
            `
            : ""
        }
      </form>

      ${isRegisterStepTwo ? "" : renderVkIdAuth()}

      ${
        isLogin
          ? `
            ${
              isModal
                ? renderButton({
                    text: "Создать аккаунт",
                    variant: "secondary",
                    tag: "button",
                    type: "button",
                    className: "auth-form__secondary-link",
                    attributes: 'data-switch-auth-mode="register"',
                  })
                : renderButton({
                    text: "Создать аккаунт",
                    variant: "secondary",
                    tag: "link",
                    href: "/register",
                    withDataLink: true,
                    className: "auth-form__secondary-link",
                  })
            }
          `
          : ""
      }
    </section>
  `;
}
