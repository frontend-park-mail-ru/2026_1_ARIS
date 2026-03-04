import { renderLogo } from "../../components/logo/logo.js";
import { renderButton } from "../../components/button/button.js";

export function renderLogin() {
  return `
    <section>
      ${renderLogo()}
      <h1>Войти</h1>
      <p>TODO: страница авторизации</p>
      ${renderButton({ text: "Войти", variant: "primary" })}
    </section>
  `;
}
