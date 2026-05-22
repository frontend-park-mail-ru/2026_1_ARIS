/**
 * Разметка модального окна авторизации.
 */
import { renderAuthForm } from "../auth-form/auth-form";
import { renderModalCloseButton } from "../modal-close/modal-close";
import type { RegisterDraft } from "../../state/register-draft";

export type AuthMode = "login" | "register";

type RenderAuthModalOptions = {
  mode?: AuthMode;
  registerDraft?: RegisterDraft | null;
};

/**
 * Рендерит внутреннюю панель модального окна авторизации.
 *
 * @param {AuthMode} mode Активный режим формы: вход или регистрация.
 * @param {RegisterDraft | null} draft Черновик регистрации для восстановления шага и введённых значений.
 * @returns {string} HTML-разметка содержимого модального окна.
 */
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
 *
 * @param {RenderAuthModalOptions} [options={}] Параметры начального состояния модального окна.
 * @returns {string} HTML-разметка нативного диалога авторизации.
 */
export function renderAuthModal({
  mode = "login",
  registerDraft = null,
}: RenderAuthModalOptions = {}): string {
  return `<dialog class="auth-modal" data-auth-modal>${renderAuthModalPanel(mode, registerDraft)}</dialog>`;
}
