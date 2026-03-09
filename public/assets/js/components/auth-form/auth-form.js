/**
 * Escapes unsafe HTML.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Renders one auth input.
 * @param {Object} options
 * @param {string} options.type
 * @param {string} options.name
 * @param {string} options.placeholder
 * @param {boolean} [options.withToggle=false]
 * @returns {string}
 */
function renderAuthInput({ type, name, placeholder, withToggle = false }) {
  const toggleButton = withToggle
    ? `
      <button
        type="button"
        class="auth-form__input-action"
        aria-label="Показать или скрыть пароль"
      >
        <img src="assets/img/icons/eye-off-thin.svg" alt="">
      </button>
    `
    : "";

  return `
    <label class="auth-form__field">
      <span class="auth-form__field-control">
        <input
          class="auth-form__input"
          type="${escapeHtml(type)}"
          name="${escapeHtml(name)}"
          placeholder="${escapeHtml(placeholder)}"
          autocomplete="off"
        >
        ${toggleButton}
      </span>
    </label>
  `;
}

/**
 * Renders auth form in login mode.
 * @returns {string}
 */
function renderLoginFields() {
  return `
    ${renderAuthInput({
      type: "text",
      name: "login",
      placeholder: "Логин",
    })}

    ${renderAuthInput({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      withToggle: true,
    })}
  `;
}

/**
 * Renders auth form in register mode.
 * @returns {string}
 */
function renderRegisterFields() {
  return `
    ${renderAuthInput({
      type: "text",
      name: "firstName",
      placeholder: "Имя",
    })}

    ${renderAuthInput({
      type: "text",
      name: "lastName",
      placeholder: "Фамилия",
    })}

    ${renderAuthInput({
      type: "text",
      name: "birthDate",
      placeholder: "Дата рождения (дд/мм/гггг)",
    })}

    ${renderAuthInput({
      type: "text",
      name: "login",
      placeholder: "Логин",
    })}

    ${renderAuthInput({
      type: "password",
      name: "password",
      placeholder: "Пароль",
      withToggle: true,
    })}

    ${renderAuthInput({
      type: "password",
      name: "repeatPassword",
      placeholder: "Повторите пароль",
      withToggle: true,
    })}
  `;
}

/**
 * Renders auth form.
 * @param {Object} options
 * @param {"login"|"register"} options.mode
 * @returns {string}
 */
export function renderAuthForm({ mode }) {
  const isLogin = mode === "login";

  return `
    <section class="auth-form">
      <img class="auth-form__logo" src="assets/img/logo.svg" alt="ARIS">

      <h1 class="auth-form__title">${isLogin ? "Вход" : "Регистрация"}</h1>

      <p class="auth-form__subtitle">
        ${isLogin ? "Введите логин и пароль" : "Все поля обязательны"}
      </p>

      <form class="auth-form__form" novalidate>
        ${isLogin ? renderLoginFields() : renderRegisterFields()}

        <button type="submit" class="auth-form__submit">
          Продолжить
        </button>
      </form>

      ${
        isLogin
          ? `
            <a href="/register" data-link class="auth-form__secondary-link">
              Создать аккаунт
            </a>
          `
          : `
            <p class="auth-form__bottom-text">
              Уже есть аккаунт?
              <a href="/login" data-link class="auth-form__inline-link">Войти</a>
            </p>

            <a href="/feed" data-link class="auth-form__secondary-link">
              Сначала посмотреть
            </a>
          `
      }
    </section>
  `;
}
