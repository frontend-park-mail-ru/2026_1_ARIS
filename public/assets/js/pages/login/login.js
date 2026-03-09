import { renderButton } from "../../components/button/button.js";
import { renderInput } from "../../components/input/input.js";

export function renderLogin() {
  return `
    <div class="login-page">

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
              ${renderInput({
                type: "text",
                name: "login",
                placeholder: "Логин",
                state: "default",
                className: "login-card__input-control",
              })}

              ${renderInput({
                type: "password",
                name: "password",
                placeholder: "Пароль",
                state: "default",
                withToggle: true,
                isVisible: false,
                className: "login-card__input-control",
              })}
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
