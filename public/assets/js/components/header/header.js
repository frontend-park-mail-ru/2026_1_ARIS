import { mockSession } from "../../mock/session.js";
import { renderButton } from "../button/button.js";

/**
 * Renders header for guest user.
 * @returns {string}
 */
function renderGuestHeader() {
  return `
    <div class="header__inner header__inner--guest">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="assets/img/logo.svg" alt="ARIS">
      </a>

      <div class="header__guest-actions">
        ${renderButton({
          text: "Регистрация",
          variant: "primary",
          tag: "button",
          type: "button",
          attributes: 'data-open-auth-modal="register"',
        })}

        ${renderButton({
          text: "Войти",
          variant: "secondary",
          tag: "button",
          type: "button",
          attributes: 'data-open-auth-modal="login"',
        })}
      </div>

      <a href="/login" data-link class="header__user">
        <span class="header__username">Твоя страничка</span>
        <div class="header__avatar" aria-hidden="true"></div>
      </a>
    </div>
  `;
}

/**
 * Renders header for authorised user.
 * @returns {string}
 */
function renderAuthorisedHeader() {
  const fullName = `${mockSession.user.firstName} ${mockSession.user.lastName}`;

  return `
    <div class="header__inner header__inner--authorised">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="assets/img/logo.svg" alt="ARIS">
      </a>

      <label class="header__search-box" aria-label="Поиск">
        <span class="header__search-icon" aria-hidden="true">
          <img src="assets/img/icons/search.svg" alt="">
        </span>
        <input
          class="header__search-input"
          type="text"
          placeholder="Поиск"
        >
      </label>

      <div class="header__user">
        <span class="header__username">${fullName}</span>
        <div class="header__avatar" aria-hidden="true"></div>
      </div>
    </div>
  `;
}

/**
 * Renders page header.
 * @returns {string}
 */
export function renderHeader() {
  const isAuthorised = mockSession.user !== null;

  return `
    <header class="header">
      ${isAuthorised ? renderAuthorisedHeader() : renderGuestHeader()}
    </header>
  `;
}
