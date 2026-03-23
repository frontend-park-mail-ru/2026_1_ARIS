import { renderAuthForm } from "../../components/auth-form/auth-form";

/**
 * Renders the register page.
 *
 * @returns {string}
 */
export function renderRegister(): string {
  return `
    <div class="auth-page auth-page--register">
      <main class="auth-page__content">
        ${renderAuthForm({ mode: "register" })}
      </main>
    </div>
  `;
}