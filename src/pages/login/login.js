import { renderButton } from "../../components/button/button.js";
import { renderInput } from "../../components/input/input.js";
import { renderAuthForm } from "../../components/auth-form/auth-form.js";

/**
 * Renders the login page.
 * @returns {string}
 */
export function renderLogin() {
  return `
    <div class="login-page">
      <main class="login-page__content">
        ${renderAuthForm({ mode: "login" })}
      </main>
    </div>
  `;
}
