import { renderInput } from "../../../../../components/input/input";
import { renderModalCloseButton } from "../../../../../components/modal-close/modal-close";
import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import type { RenderJoinPasswordModalOptions } from "./types";

/**
 * Рендерит модалку ввода пароля для комнаты из списка.
 */
export function renderJoinPasswordModal(options: RenderJoinPasswordModalOptions): string {
  if (!options.roomId) return "";

  return `
    <div class="games-confirm-modal" data-games-join-password-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(gameT("modal.joinByPassword"))}">
        <div class="games-confirm-modal__header">
          <h2 class="games-confirm-modal__title">${escapeHtml(gameT("modal.joinRoomTitle"))}</h2>
          ${renderModalCloseButton({
            className: "games-confirm-modal__close",
            attributes: "data-games-join-password-close",
          })}
        </div>
        <p class="games-confirm-modal__text">${escapeHtml(options.roomTitle || gameT("rooms.untitled"))}</p>
        ${options.authorMarkup ? `<div class="games-join-modal-author">${options.authorMarkup}</div>` : ""}
        <form class="games-password-modal-form" data-games-join-listed-room>
          <input type="hidden" name="roomId" value="${escapeHtml(options.roomId)}">
          ${options.inviteCode ? `<input type="hidden" name="inviteCode" value="${escapeHtml(options.inviteCode)}">` : ""}
          <div class="games-field">
            <span>${escapeHtml(gameT("room.passwordLabel").replace(/:$/, ""))}</span>
          ${renderInput({
            type: "password",
            name: "password",
            value: escapeHtml(options.passwordValue),
            state: options.error ? "error" : "default",
            withToggle: true,
            isVisible: options.passwordVisible,
            className: "games-join-password-modal__input",
            attributes:
              'maxlength="64" required data-games-join-password-field aria-invalid="' +
              (options.error ? "true" : "false") +
              '"',
          })}
          </div>
          <p class="games-inline-error games-join-password-modal__error" aria-live="polite">${escapeHtml(options.error)}</p>
          <div class="games-confirm-modal__actions">
            <button type="submit" class="games-button games-button--primary" ${options.loading ? "disabled" : ""}>
              ${escapeHtml(gameT("modal.joinConfirm"))}
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-join-password-close>
              ${escapeHtml(gameT("modal.cancel"))}
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}
