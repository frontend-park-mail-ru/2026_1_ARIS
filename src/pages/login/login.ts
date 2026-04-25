import { renderAuthForm } from "../../components/auth-form/auth-form";
import { renderFeed } from "../feed/feed";
import { getSessionUser } from "../../state/session";

/**
 * Рендерит страницу входа.
 *
 * @returns {string}
 */
export async function renderLogin(): Promise<string> {
  if (getSessionUser()) {
    window.history.replaceState({}, "", "/feed");
    document.title = "ARISNET — Feed";
    return renderFeed();
  }

  return `
    <div class="auth-page auth-page--login">
      <div class="auth-page__backdrop" aria-hidden="true"></div>
      <main class="auth-page__content">
        <div class="auth-page__panel">
          ${renderAuthForm({ mode: "login", context: "modal" })}
        </div>
      </main>
    </div>
  `;
}
