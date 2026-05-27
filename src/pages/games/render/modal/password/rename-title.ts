import { renderModalCloseButton } from "../../../../../components/modal-close/modal-close";
import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import { renderModalError } from "../shared";
import type { RenderRenameTitleModalOptions } from "./types";

/**
 * Рендерит модалку переименования комнаты.
 */
export function renderRenameTitleModal(options: RenderRenameTitleModalOptions): string {
  if (!options.open) return "";

  return `
    <div class="games-confirm-modal" data-games-rename-title-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(gameT("modal.renameTitle"))}">
        <div class="games-confirm-modal__header">
          <h2 class="games-confirm-modal__title">${escapeHtml(gameT("modal.renameTitle"))}</h2>
          ${renderModalCloseButton({
            className: "games-confirm-modal__close",
            attributes: "data-games-rename-title-close",
          })}
        </div>
        <form class="games-password-modal-form" data-games-rename-title-form>
          <label class="games-field">
            <span>${escapeHtml(gameT("modal.renameLabel"))}</span>
            <input
              type="text"
              name="title"
              maxlength="30"
              value="${escapeHtml(options.roomTitle)}"
              required
              aria-invalid="false"
            >
            <span class="games-field__error" data-games-title-error aria-live="polite"></span>
          </label>
          ${renderModalError(options.error)}
          <div class="games-confirm-modal__actions">
            <button type="submit" class="games-button games-button--primary" ${options.loading ? "disabled" : ""}>
              ${escapeHtml(gameT("modal.save"))}
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-rename-title-close>
              ${escapeHtml(gameT("modal.cancel"))}
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}
