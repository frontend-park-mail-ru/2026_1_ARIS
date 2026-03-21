import { renderAuthForm } from "../../components/auth-form/auth-form.js";

/**
 * Renders the register page.
 * @returns {string}
 */
export function renderRegister() {
  return `
    <div class="auth-page auth-page--register">
      <main class="auth-page__content">
        ${renderAuthForm({ mode: "register" })}
      </main>
    </div>
  `;
}
