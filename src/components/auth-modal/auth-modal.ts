import { renderAuthForm } from "../auth-form/auth-form";
import { renderModalCloseButton } from "../modal-close/modal-close";
import type { RegisterDraft } from "../../state/register-draft";

export type AuthMode = "login" | "register";

type RenderAuthModalOptions = {
  mode?: AuthMode;
  registerDraft?: RegisterDraft | null;
};

export function renderAuthModalPanel(mode: AuthMode, draft: RegisterDraft | null): string {
  return `
    <div class="auth-modal__panel">
      ${renderModalCloseButton({
        className: "auth-modal__close",
        attributes: "data-auth-modal-close",
      })}

      ${renderAuthForm({
        mode,
        context: "modal",
        registerStep: draft?.step || 1,
        registerValues: draft?.values || {},
      })}
    </div>
  `;
}

/**
 * Рендерит модальное окно авторизации как нативный <dialog>.
 */
export function renderAuthModal({
  mode = "login",
  registerDraft = null,
}: RenderAuthModalOptions = {}): string {
  return `<dialog class="auth-modal" data-auth-modal>${renderAuthModalPanel(mode, registerDraft)}</dialog>`;
}
