import { renderButton } from "../button/button.js";
import { renderInput } from "../input/input.js";

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
 * Renders auth form in login mode.
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
 * Renders auth form in register mode.
 * @returns {string}
 */
function renderRegisterFields() {
  return `
    ${renderAuthField({
      type: "text",
      name: "firstName",
      placeholder: "Имя",
      state: "default",
    })}

    ${renderAuthField({
      type: "text",
      name: "lastName",
      placeholder: "Фамилия",
      state: "default",
    })}

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
    })}

    ${renderAuthField({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      state: "default",
      withToggle: true,
      isVisible: false,
    })}

    ${renderAuthField({
      type: "password",
      name: "repeatPassword",
      placeholder: "Повторите пароль",
      state: "default",
      withToggle: true,
      isVisible: false,
    })}
  `;
}

/**
 * Renders auth form.
 * @param {Object} options
 * @param {"login"|"register"} options.mode
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
      <img class="auth-form__logo" src="assets/img/logo.svg" alt="ARIS">

      <h1 class="auth-form__title">${isLogin ? "Вход" : "Регистрация"}</h1>

      <p class="auth-form__subtitle">
        ${isLogin ? "Введите логин и пароль" : "Все поля обязательны"}
      </p>

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

        <div class="auth-form__actions">
          ${renderButton({
            text: "Продолжить",
            variant: "primary",
            tag: "button",
            type: "submit",
            className: "auth-form__submit",
          })}
        </div>
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
          : `
            <div class="auth-form__bottom-row">
            <p class="auth-form__bottom-text">Уже есть аккаунт?</p>

            ${
              isModal
                ? renderButton({
                    text: "Войти",
                    variant: "surface",
                    tag: "button",
                    type: "button",
                    className: "auth-form__bottom-login",
                    attributes: 'data-switch-auth-mode="login"',
                  })
                : renderButton({
                    text: "Войти",
                    variant: "surface",
                    tag: "link",
                    href: "/login",
                    withDataLink: true,
                    className: "auth-form__bottom-login",
                  })
            }
            </div>

            ${
              isModal
                ? renderButton({
                    text: "Сначала посмотреть",
                    variant: "secondary",
                    tag: "button",
                    type: "button",
                    className: "auth-form__secondary-link",
                    attributes: "data-auth-modal-close",
                  })
                : renderButton({
                    text: "Сначала посмотреть",
                    variant: "secondary",
                    tag: "link",
                    href: "/feed",
                    withDataLink: true,
                    className: "auth-form__secondary-link",
                  })
            }
          `
      }
    </section>
  `;
}
