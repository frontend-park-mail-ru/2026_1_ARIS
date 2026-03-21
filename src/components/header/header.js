import { clearSessionUser, getSessionUser } from "../../state/session.js";
import { renderButton } from "../button/button.js";
import { logoutUser } from "../../api/auth.js";

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
          className: "button--large",
          attributes: 'data-open-auth-modal="register"',
        })}

        ${renderButton({
          text: "Войти",
          variant: "secondary",
          tag: "button",
          type: "button",
          className: "button--small",
          attributes: 'data-open-auth-modal="login"',
        })}
      </div>

      <a href="/login" data-open-auth-modal="login" class="header__user">
        <span class="header__username">Твоя страничка</span>
        <img
          class="header__avatar"
          src="assets/img/default-avatar.png"
          alt="Гостевой профиль"
        >
      </a>
    </div>
  `;
}

/**
 * Renders header for authorised user.
 * @returns {string}
 */
function renderAuthorisedHeader() {
  const user = getSessionUser();
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";

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

        <button class="header__logout" data-logout>
          Выйти
        </button>

        ${
          user?.avatarLink
            ? `<img class="header__avatar" src="/image-proxy?url=${encodeURIComponent(
                user?.avatarLink,
              )}" alt="${fullName}">`
            : `<img class="header__avatar" src="assets/img/default-avatar.png" alt="${fullName}">`
        }
      </div>
    </div>
  `;
}

/**
 * Renders page header depending on user auth state.
 * @returns {string}
 */
export function renderHeader() {
  const isAuthorised = getSessionUser() !== null;

  return `
    <header class="header">
      ${isAuthorised ? renderAuthorisedHeader() : renderGuestHeader()}
    </header>
  `;
}

/**
 * Initializes header behaviour (logout handler).
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initHeader(root = document) {
  if (root.__headerBound) return;

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest("[data-logout]");
    if (!btn) return;

    try {
      await logoutUser();
      clearSessionUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  root.__headerBound = true;
}
