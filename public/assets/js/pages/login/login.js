import { renderHeader } from "../../components/header/header.js";
import { renderButton } from "../../components/button/button.js";
import { renderEyeToggle } from "../../components/eye-toggle/eye-toggle.js";

export function renderLogin() {
  return `
    <div class="login-page">
      ${renderHeader()}

      <main class="login-page__content">
        <section class="login-card">
          <img
            class="login-card__logo"
            src="assets/img/icons/logo-auth.svg"
            alt="ARIS"
          >

          <h1 class="login-card__title">Вход</h1>

          <p class="login-card__subtitle">
            Введите логин и пароль
          </p>

          <form class="login-card__form">

            <div class="login-card__fields">

              <input
                class="login-card__input"
                type="text"
                placeholder="Логин"
              >

              <div class="login-card__password">
                <input
                  class="login-card__input login-card__input--password"
                  type="password"
                  placeholder="Пароль"
                >

              ${renderEyeToggle({
                isVisible: false,
                className: "login-card__eye",
              })}
              </div>

            </div>

            <div class="login-card__actions">

            ${renderButton({
              text: "Продолжить",
              variant: "primary",
              tag: "button",
              type: "submit",
              className: "login-card__submit",
            })}

            ${renderButton({
              text: "Создать аккаунт",
              variant: "secondary",
              tag: "link",
              href: "/register",
              withDataLink: true,
              className: "login-card__register",
            })}

            </div>

          </form>
        </section>
      </main>
    </div>
  `;
}
