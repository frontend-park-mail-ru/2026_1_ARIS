import { renderInput } from "../../../../../components/input/input";
import { renderModalCloseButton } from "../../../../../components/modal-close/modal-close";
import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import { renderModalError } from "../shared";
import type { RenderPasswordModalOptions } from "./types";

/**
 * Рендерит подтверждение удаления пароля комнаты.
 */
function renderRemovePasswordModal(options: RenderPasswordModalOptions): string {
  return `
    <div class="games-confirm-modal" data-games-password-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(gameT("modal.removePasswordTitle"))}">
        <h2 class="games-confirm-modal__title">${escapeHtml(gameT("modal.removePasswordTitle"))}</h2>
        <p class="games-confirm-modal__text">${escapeHtml(gameT("modal.removePasswordText"))}</p>
        ${renderModalError(options.error)}
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--danger" data-games-password-remove-confirm ${options.loading ? "disabled" : ""}>
            ${escapeHtml(gameT("menu.removePassword"))}
          </button>
          <button type="button" class="games-button games-button--secondary" data-games-password-modal-close>
            ${escapeHtml(gameT("modal.cancel"))}
          </button>
        </div>
      </section>
    </div>
  `;
}

/**
 * Рендерит форму установки или изменения пароля комнаты.
 */
function renderSetPasswordModal(options: RenderPasswordModalOptions): string {
  const title =
    options.mode === "change" ? gameT("menu.changePassword") : gameT("menu.setPassword");

  return `
    <div class="games-confirm-modal" data-games-password-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="games-confirm-modal__header">
          <h2 class="games-confirm-modal__title">${escapeHtml(title)}</h2>
          ${renderModalCloseButton({
            className: "games-confirm-modal__close",
            attributes: "data-games-password-modal-close",
          })}
        </div>
        <form class="games-password-modal-form" data-games-password-form>
          <div class="games-field">
            <span>${escapeHtml(gameT("room.passwordLabel").replace(/:$/, ""))}</span>
            ${renderInput({
              type: "password",
              name: "password",
              withToggle: true,
              attributes: 'maxlength="64" required',
            })}
          </div>
          ${renderModalError(options.error)}
          <div class="games-confirm-modal__actions">
            <button type="submit" class="games-button games-button--primary" ${options.loading ? "disabled" : ""}>
              ${escapeHtml(gameT("modal.save"))}
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-password-modal-close>
              ${escapeHtml(gameT("modal.cancel"))}
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

/**
 * Рендерит модалку установки, изменения или удаления пароля комнаты.
 */
export function renderPasswordModal(options: RenderPasswordModalOptions): string {
  if (!options.mode) return "";

  if (options.mode === "remove") {
    return renderRemovePasswordModal(options);
  }

  return renderSetPasswordModal(options);
}
