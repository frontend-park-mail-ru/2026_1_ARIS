import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import { renderNumericCreateInput } from "./numeric-input";
import type { RenderCreateRoomFormOptions, RenderJoinByCodeFormOptions } from "./types";

/** Рендерит inline-ошибку формы создания комнаты. */
function renderCreateRoomError(message: string): string {
  return message ? `<p class="games-inline-error">${escapeHtml(message)}</p>` : "";
}

/** Рендерит общую форму создания игровой комнаты. */
export function renderCreateRoomForm(options: RenderCreateRoomFormOptions): string {
  return `
    <div class="games-lobby-subview">
      <form id="games-create-room-form" class="games-form games-form--plain games-form--wide" data-games-create-room novalidate>
        <div class="games-form-grid">
          <label class="games-field games-field--full">
            <span>${escapeHtml(gameT("create.roomTitle"))}</span>
            <input type="text" name="title" maxlength="30" required aria-invalid="false">
            <span class="games-field__error" data-games-title-error aria-live="polite"></span>
          </label>
          <label class="games-field">
            <span>${escapeHtml(gameT("create.maxPlayers"))}</span>
            ${renderNumericCreateInput({
              name: "maxPlayers",
              value: "2",
              min: 2,
              max: 8,
              minMessage: gameT("create.minPlayersError"),
              maxMessage: gameT("create.maxPlayersError"),
            })}
          </label>
          <label class="games-field">
            <span>${escapeHtml(gameT("create.questionCount"))}</span>
            ${renderNumericCreateInput({
              name: "questionCount",
              value: "5",
              min: 1,
              max: 20,
              minMessage: gameT("create.minQuestionsError"),
              maxMessage: gameT("create.maxQuestionsError"),
            })}
          </label>
          <label class="games-field">
            <span class="games-field__label-row">
              <span>${escapeHtml(gameT("create.answerTimeout"))}</span>
            </span>
            ${renderNumericCreateInput({
              name: "answerTimeoutSec",
              value: "10",
              min: 0,
              max: 300,
              minMessage: gameT("create.minTimeoutError"),
              maxMessage: gameT("create.maxTimeoutError"),
            })}
          </label>
          <label class="games-field">
            <span>${escapeHtml(gameT("create.passwordOptional"))}</span>
            <input type="password" name="password" maxlength="64">
          </label>
          <div class="games-rating-toggle games-field--full">
            <span class="games-rating-toggle__label">
              <span>${escapeHtml(gameT("create.ranked"))}</span>
              <span class="games-rating-toggle__hint">
                <button
                  type="button"
                  class="games-catalog-card__hint-button games-field-hint-button"
                  data-games-catalog-hint
                  aria-controls="games-rating-toggle-hint"
                  aria-label="${escapeHtml(gameT("create.showRankedHint"))}"
                  aria-expanded="false"
                >
                  ?
                </button>
                <span id="games-rating-toggle-hint" class="games-field-popover" popover="manual" hidden>
                  ${escapeHtml(gameT("create.rankedHint"))}
                </span>
              </span>
            </span>
            <fieldset class="games-ready-segmented games-ready-segmented--compact games-rating-segmented" aria-label="${escapeHtml(gameT("create.ranked"))}">
              <label class="games-ready-segmented__option">
                <input class="games-ready-segmented__input" type="radio" name="isRanked" value="false" checked>
                <span class="games-ready-segmented__text">${escapeHtml(gameT("create.casual"))}</span>
              </label>
              <label class="games-ready-segmented__option">
                <input class="games-ready-segmented__input" type="radio" name="isRanked" value="true">
                <span class="games-ready-segmented__text">${escapeHtml(gameT("create.rankedMode"))}</span>
              </label>
            </fieldset>
          </div>
          <button type="submit" class="games-button games-button--primary games-create-actions__submit" ${options.loading ? "disabled" : ""}>
            ${escapeHtml(options.loading ? gameT("create.submitting") : gameT("create.submit"))}
          </button>
        </div>

        ${renderCreateRoomError(options.error)}
      </form>
    </div>
  `;
}

/** Рендерит форму входа в комнату по коду приглашения. */
export function renderJoinByCodeForm(options: RenderJoinByCodeFormOptions): string {
  return `
    <div class="games-lobby-subview">
      <form id="games-join-room-form" class="games-form games-form--plain games-form--invite games-form-grid" data-games-join-room>
        <label class="games-field${options.inviteCodeError ? " games-field--invalid" : ""}">
          <span>${escapeHtml(gameT("join.inviteCode"))}</span>
          <input
            type="text"
            name="inviteCode"
            maxlength="6"
            value="${escapeHtml(options.inviteCodeValue)}"
            autocomplete="off"
            autocapitalize="characters"
            data-games-invite-code-field
            aria-invalid="${options.inviteCodeError ? "true" : "false"}"
          >
          <span class="games-field__error" data-games-invite-code-error aria-live="polite">${escapeHtml(options.inviteCodeError)}</span>
        </label>
        <label class="games-field${options.passwordError ? " games-field--invalid" : ""}">
          <span>${escapeHtml(gameT("join.passwordOptional"))}</span>
          <input
            type="password"
            name="password"
            maxlength="64"
            value="${escapeHtml(options.passwordValue)}"
            data-games-join-password-field
            aria-invalid="${options.passwordError ? "true" : "false"}"
          >
          <span class="games-field__error" data-games-join-password-error aria-live="polite">${escapeHtml(options.passwordError)}</span>
        </label>
        <button type="submit" class="games-button games-button--primary games-join-actions__submit" ${options.loading ? "disabled" : ""}>
          ${escapeHtml(options.loading ? gameT("join.submitting") : gameT("join.submit"))}
        </button>
      </form>
    </div>
  `;
}
