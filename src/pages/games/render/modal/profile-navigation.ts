import { renderModalCloseButton } from "../../../../components/modal-close/modal-close";
import { escapeHtml, renderAvatarMarkup } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import type { GameProfileNavigationConfirm } from "../../state/store";

/** Рендерит подтверждение перехода в профиль игрока. */
export function renderProfileNavigationConfirmModal(
  profile: GameProfileNavigationConfirm | null,
): string {
  if (!profile) return "";

  const avatarMarkup = renderAvatarMarkup(
    "games-profile-nav-modal__avatar",
    profile.name,
    profile.avatarUrl,
    {
      width: 56,
      height: 56,
    },
  );

  return `
    <div class="games-confirm-modal" data-games-profile-nav-modal>
      <section class="games-confirm-modal__dialog games-confirm-modal__dialog--profile-nav" role="dialog" aria-modal="true" aria-label="${escapeHtml(gameT("modal.profileNavAria"))}">
        <div class="games-confirm-modal__header">
          <h2 class="games-confirm-modal__title">${escapeHtml(gameT("modal.profileNavTitle"))}</h2>
          ${renderModalCloseButton({
            className: "games-confirm-modal__close",
            attributes: "data-games-profile-nav-close",
          })}
        </div>
        <div class="games-profile-nav-modal__user">
          ${avatarMarkup}
          <strong>${escapeHtml(profile.name)}</strong>
        </div>
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--primary" data-games-profile-nav-confirm>
            ${escapeHtml(gameT("modal.profileNavConfirm"))}
          </button>
          <button type="button" class="games-button games-button--secondary" data-games-profile-nav-close>
            ${escapeHtml(gameT("modal.cancel"))}
          </button>
        </div>
      </section>
    </div>
  `;
}
