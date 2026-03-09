import { mockSession } from "../../mock/session.js";

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
        <a href="/register" data-link class="header__guest-button header__guest-button--primary">
          Регистрация
        </a>

        <a href="/login" data-link class="header__guest-button header__guest-button--secondary">
          Войти
        </a>
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
        <span class="header__username">Сергей Шульгиненко</span>
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
