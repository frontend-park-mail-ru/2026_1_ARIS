import { renderAuthForm } from "../../components/auth-form/auth-form";

/**
 * Renders the login page.
 *
 * @returns {string}
 */
export function renderLogin(): string {
  return `
    <div class="auth-page auth-page--login">
      <main class="auth-page__content">
        ${renderAuthForm({ mode: "login" })}
      </main>
    </div>
  `;
}