import { renderButton } from "../button/button.js";
import { renderAuthForm } from "../auth-form/auth-form.js";

/**
 * Renders the authentication modal.
 * @param {Object} [options]
 * @param {"login"|"register"} [options.mode="login"]
 * @returns {string}
 */
export function renderAuthModal({ mode = "login" } = {}) {
  return `
    <div class="auth-modal" data-auth-modal>
      <div class="auth-modal__overlay" data-auth-modal-close></div>

      <div class="auth-modal__content">
        <div class="auth-modal__panel">
          ${renderButton({
            text: "×",
            variant: "surface",
            tag: "button",
            type: "button",
            className: "auth-modal__close",
            attributes: 'aria-label="Закрыть" data-auth-modal-close',
          })}

          ${renderAuthForm({ mode, context: "modal" })}
        </div>
      </div>
    </div>
  `;
}
