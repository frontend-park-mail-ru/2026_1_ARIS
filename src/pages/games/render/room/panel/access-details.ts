import type { GameRoom } from "../../../../../api/games";
import { escapeHtml } from "../../../../../utils/avatar";
import { gameT } from "../../../shared/i18n";
import type { RenderRoomPanelOptions } from "./types";

/** Рендерит карточку названия комнаты и переключатель ranked-режима. */
function renderRoomTitleDetails(options: RenderRoomPanelOptions): string {
  const { roomTitle, titleMenuOpen, rankedToggle } = options;
  return `
    <div class="games-room-details">
      <section class="games-room-detail-card games-room-detail-card--stacked" aria-label="${escapeHtml(gameT("room.titleAria"))}">
        <div class="games-room-detail-card__content">
          <span class="games-room-detail-card__label">${escapeHtml(gameT("room.titleLabel"))}</span>
          <span class="games-room-detail-card__value">${escapeHtml(roomTitle || "—")}</span>
        </div>
        <div class="games-access-menu">
          <button
            type="button"
            class="games-menu-toggle"
            data-games-title-menu-toggle
            aria-label="${escapeHtml(gameT("room.titleActionsAria"))}"
            aria-expanded="${titleMenuOpen ? "true" : "false"}"
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </section>
      ${rankedToggle}
    </div>
  `;
}

/** Рендерит карточку кода приглашения. */
function renderInviteCodeDetails(room: GameRoom): string {
  return `
    <section class="games-room-detail-card games-room-detail-card--stacked" aria-label="${escapeHtml(gameT("room.inviteCodeAria"))}">
      <div
        class="games-room-detail-card__copy"
        data-games-copy-invite="${escapeHtml(room.inviteCode || "")}"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(gameT("room.inviteCodeCopyAria"))}"
      >
        <span class="games-room-detail-card__content">
          <span class="games-room-detail-card__label-row">
            <span class="games-room-detail-card__label">${escapeHtml(gameT("room.inviteCodeLabel"))}</span>
            <span class="games-room-detail-card__hint">
              <button
                type="button"
                class="games-catalog-card__hint-button games-field-hint-button"
                data-games-catalog-hint
                aria-controls="games-room-invite-code-hint"
                aria-label="${escapeHtml(gameT("room.inviteCodeHintAria"))}"
                aria-expanded="false"
              >
                ?
              </button>
              <span
                id="games-room-invite-code-hint"
                class="games-field-popover games-field-popover--check"
                popover="manual"
                hidden
              >
                ${escapeHtml(gameT("room.inviteCodeHint"))}
              </span>
            </span>
          </span>
          <strong class="games-room-detail-card__code">${escapeHtml(room.inviteCode || "—")}</strong>
        </span>
      </div>
    </section>
  `;
}

/** Рендерит карточку пароля комнаты. */
function renderPasswordDetails(options: RenderRoomPanelOptions): string {
  const { roomPasswordDisplay, canDisbandRoom, passwordMenuOpen } = options;
  return `
    <section class="games-room-detail-card games-room-detail-card--stacked" aria-label="${escapeHtml(gameT("room.passwordAria"))}">
      <div class="games-room-detail-card__content">
        <span class="games-room-detail-card__label-row">
          <span class="games-room-detail-card__label">${escapeHtml(gameT("room.passwordLabel"))}</span>
          <span class="games-room-detail-card__hint">
            <button
              type="button"
              class="games-catalog-card__hint-button games-field-hint-button"
              data-games-catalog-hint
              aria-controls="games-room-password-hint"
              aria-label="${escapeHtml(gameT("room.passwordHintAria"))}"
              aria-expanded="false"
            >
              ?
            </button>
            <span
              id="games-room-password-hint"
              class="games-field-popover games-field-popover--check"
              popover="manual"
              hidden
            >
              ${escapeHtml(gameT("room.passwordHint"))}
            </span>
          </span>
        </span>
        <span class="games-room-detail-card__value">${escapeHtml(roomPasswordDisplay)}</span>
      </div>
      ${
        canDisbandRoom
          ? `
            <div class="games-access-menu">
              <button
                type="button"
                class="games-menu-toggle"
                data-games-password-menu-toggle
                aria-label="${escapeHtml(gameT("room.passwordActionsAria"))}"
                aria-expanded="${passwordMenuOpen ? "true" : "false"}"
              >
                <span></span><span></span><span></span>
              </button>
            </div>
          `
          : ""
      }
    </section>
  `;
}

/** Рендерит блок доступа к комнате: название, тип, invite-код и пароль. */
export function renderRoomAccessDetails(options: RenderRoomPanelOptions): string {
  if (options.room.status !== "waiting") return "";
  return `
    ${renderRoomTitleDetails(options)}
    <div class="games-room-actions">
      ${renderInviteCodeDetails(options.room)}
      ${renderPasswordDetails(options)}
    </div>
  `;
}
