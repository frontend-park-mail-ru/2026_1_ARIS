import { renderButton } from "../button/button.js";
import { renderInput } from "../input/input.js";

/**
 * Renders auth form in login mode.
 * @returns {string}
 */
function renderLoginFields(hasError) {
  const state = hasError ? "error" : "default";

  return `
    ${renderInput({
      type: "text",
      name: "login",
      placeholder: "Логин",
      state,
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      state,
      withToggle: true,
      isVisible: false,
      className: "auth-form__input-control",
    })}
  `;
}

/**
 * Renders auth form in register mode.
 * @returns {string}
 */
function renderRegisterFields() {
  return `
    ${renderInput({
      type: "text",
      name: "firstName",
      placeholder: "Имя",
      state: "default",
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "text",
      name: "lastName",
      placeholder: "Фамилия",
      state: "default",
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "text",
      name: "birthDate",
      placeholder: "Дата рождения (дд/мм/гггг)",
      state: "default",
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "text",
      name: "login",
      placeholder: "Логин",
      state: "default",
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      state: "default",
      withToggle: true,
      isVisible: false,
      className: "auth-form__input-control",
    })}

    ${renderInput({
      type: "password",
      name: "repeatPassword",
      placeholder: "Повторите пароль",
      withToggle: true,
      isVisible: false,
      className: "auth-form__input-control",
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
}) {
  const isLogin = mode === "login";

  return `
    <section class="auth-form">
      <img class="auth-form__logo" src="assets/img/logo.svg" alt="ARIS">

      <h1 class="auth-form__title">${isLogin ? "Вход" : "Регистрация"}</h1>

      <p class="auth-form__subtitle">
        ${isLogin ? "Введите логин и пароль" : "Все поля обязательны"}
      </p>

      <form class="auth-form__form" novalidate>
        <div class="auth-form__fields">
          ${isLogin ? renderLoginFields(hasError) : renderRegisterFields()}
        </div>

        <p class="auth-form__error${hasError ? "" : " auth-form__error--hidden"}">
          ${errorText}
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
      </form>

      ${
        isLogin
          ? `
            ${renderButton({
              text: "Создать аккаунт",
              variant: "secondary",
              tag: "link",
              href: "/register",
              withDataLink: true,
              className: "auth-form__secondary-link",
            })}
          `
          : `
            <p class="auth-form__bottom-text">
              Уже есть аккаунт?
              <a href="/login" data-link class="auth-form__inline-link">Войти</a>
            </p>

            ${renderButton({
              text: "Сначала посмотреть",
              variant: "secondary",
              tag: "link",
              href: "/feed",
              withDataLink: true,
              className: "auth-form__secondary-link",
            })}
          `
      }
    </section>
  `;
}
