import { renderAuthForm } from "../../components/auth-form/auth-form.js";

/**
 * Renders the register page.
 * @returns {string}
 */
export function renderRegister() {
  return `
    <div class="register-page">
      <main class="register-page__content">
        ${renderAuthForm({ mode: "register" })}
      </main>
    </div>
  `;
}
