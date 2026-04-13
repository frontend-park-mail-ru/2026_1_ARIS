import { renderAuthForm } from "../../components/auth-form/auth-form";
import { renderFeed } from "../feed/feed";
import { getSessionUser } from "../../state/session";

/**
 * Renders the register page.
 *
 * @returns {string}
 */
export async function renderRegister(): Promise<string> {
  if (getSessionUser()) {
    window.history.replaceState({}, "", "/feed");
    document.title = "ARISNET — Feed";
    return renderFeed();
  }

  return `
    <div class="auth-page auth-page--register">
      <div class="auth-page__backdrop" aria-hidden="true"></div>
      <main class="auth-page__content">
        <div class="auth-page__panel auth-page__panel--register">
          ${renderAuthForm({ mode: "register", context: "modal" })}
        </div>
      </main>
    </div>
  `;
}
