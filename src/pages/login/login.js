import { renderAuthForm } from "../../components/auth-form/auth-form.js";

/**
 * Renders the login page.
 * @returns {string}
 */
export function renderLogin() {
  return `
    <div class="auth-page auth-page--login">
      <main class="auth-page__content">
        ${renderAuthForm({ mode: "login" })}
      </main>
    </div>
  `;
}
