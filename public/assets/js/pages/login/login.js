import { renderLogo } from "../../components/logo/logo.js";
import { renderButton } from "../../components/button/button.js";
import { renderInput } from "../../components/input/input.js";

export function renderLogin() {
  return `
    <section>
      ${renderLogo()}
      <h1>Войти</h1>
      <p>TODO: страница авторизации</p>

      <div class="login-form">

        ${renderInput({
          name: "email",
          type: "email",
          placeholder: "Введите email",
          required: true,
        })}

        ${renderInput({
          name: "password",
          type: "password",
          placeholder: "Введите пароль",
          required: true,
        })}

        ${renderButton({
          text: "Войти",
          type: "submit",
          variant: "primary",
        })}
      </div>

    </section>
  `;
}
