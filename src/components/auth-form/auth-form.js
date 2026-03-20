import { renderButton } from "../button/button.js";
import { renderInput } from "../input/input.js";

/**
 * Renders a single auth form field with input and error area.
 *
 * @param {Object} options
 * @param {string} options.type
 * @param {string} options.name
 * @param {string} options.placeholder
 * @param {string} [options.state="default"]
 * @param {boolean} [options.withToggle=false]
 * @param {boolean} [options.isVisible=false]
 * @param {string} [options.errorText=""]
 * @param {string} [options.attributes=""]
 * @returns {string}
 */
function renderAuthField({
  type,
  name,
  placeholder,
  state = "default",
  withToggle = false,
  isVisible = false,
  errorText = "",
  attributes = "",
}) {
  const hasError = Boolean(errorText);

  return `
    <div class="auth-form__field-group">
      ${renderInput({
        type,
        name,
        placeholder,
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
 * Renders auth form fields for login mode.
 *
 * @param {boolean} hasError
 * @returns {string}
 */
function renderLoginFields(hasError) {
  const state = hasError ? "error" : "default";

  return `
    ${renderAuthField({
      type: "text",
      name: "login",
      placeholder: "Логин",
      state,
    })}

    ${renderAuthField({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      state,
      withToggle: true,
      isVisible: false,
    })}
  `;
}

/**
 * Renders gender select field.
 *
 * @returns {string}
 */
function renderGenderField() {
  return `
    <div class="auth-form__field-group">
      <label class="input input--default auth-form__input-control auth-form__select">
        <select class="input__field auth-form__select-field" name="gender" required>
          <option value="" selected disabled hidden>Пол</option>
          <option value="1">Мужской</option>
          <option value="2">Женский</option>
        </select>
      </label>

      <p class="auth-form__field-error auth-form__field-error--hidden">
         
      </p>
    </div>
  `;
}

/**
 * Renders auth form fields for register mode.
 *
 * @returns {string}
 */
function renderRegisterFields() {
  return `
    <div class="auth-form__register-grid">
      ${renderAuthField({
        type: "text",
        name: "firstName",
        placeholder: "Имя",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "text",
        name: "lastName",
        placeholder: "Фамилия",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderGenderField()}

      ${renderAuthField({
        type: "text",
        name: "birthDate",
        placeholder: "Дата рождения (дд/мм/гггг)",
        state: "default",
        attributes: 'inputmode="numeric" maxlength="10" data-mask="date"',
      })}

      ${renderAuthField({
        type: "text",
        name: "login",
        placeholder: "Логин",
        state: "default",
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "password",
        name: "password",
        placeholder: "Пароль",
        state: "default",
        withToggle: true,
        isVisible: false,
        attributes: 'maxlength="20"',
      })}

      ${renderAuthField({
        type: "password",
        name: "repeatPassword",
        placeholder: "Повторите пароль",
        state: "default",
        withToggle: true,
        isVisible: false,
        attributes: 'maxlength="20"',
      })}

      <div class="auth-form__actions auth-form__actions--register">
        ${renderButton({
          text: "Зарегистрироваться",
          variant: "primary",
          tag: "button",
          type: "submit",
          className: "auth-form__submit",
        })}
      </div>

      ${renderButton({
        text: "Уже есть аккаунт?",
        variant: "secondary",
        tag: "button",
        type: "button",
        className: "auth-form__secondary-link auth-form__secondary-link--login-switch",
        attributes: 'data-switch-auth-mode="login"',
      })}

      ${renderButton({
        text: "Войти без регистрации",
        variant: "secondary",
        tag: "button",
        type: "button",
        className: "auth-form__secondary-link auth-form__secondary-link--register",
        attributes: "data-auth-modal-close",
      })}
    </div>
  `;
}

/**
 * Renders auth form.
 *
 * @param {Object} options
 * @param {"login"|"register"} options.mode
 * @param {boolean} [options.hasError=false]
 * @param {string} [options.errorText="Неверный логин или пароль"]
 * @param {string} [options.context="page"]
 * @returns {string}
 */
export function renderAuthForm({
  mode,
  hasError = false,
  errorText = "Неверный логин или пароль",
  context = "page",
}) {
  const isLogin = mode === "login";
  const isModal = context === "modal";

  return `
    <section class="auth-form" data-mode="${mode}">
      <div class="auth-form__header">
        <img class="auth-form__logo" src="assets/img/logo.svg" alt="ARIS">

        <div class="auth-form__header-text">
          <h1 class="auth-form__title">${isLogin ? "Вход" : "Регистрация"}</h1>

          <p class="auth-form__subtitle">
            ${isLogin ? "Введите логин и пароль" : "Все поля обязательны"}
          </p>
        </div>
      </div>

      <form class="auth-form__form" novalidate>
        <div class="auth-form__fields">
          ${isLogin ? renderLoginFields(hasError) : renderRegisterFields()}
        </div>

        ${
          isLogin
            ? `
              <p class="auth-form__error${hasError ? "" : " auth-form__error--hidden"}">
                ${errorText}
              </p>
            `
            : ""
        }

        ${
          isLogin
            ? `
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
