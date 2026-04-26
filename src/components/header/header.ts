import { clearSessionUser, getSessionUser } from "../../state/session";
import { renderButton } from "../button/button";
import { logoutUser } from "../../api/auth";

/**
 * Тип пользовательской сессии (минимально необходимый)
 */
type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
} | null;

/**
 * Рендерит хедер для гостя.
 *
 * @returns {string}
 */
function renderGuestHeader(): string {
  return `
    <div class="header__inner header__inner--guest">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/icons/logo-auth.svg" alt="ARIS">
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
          src="/assets/img/default-avatar.png"
          alt="Гостевой профиль"
        >
      </a>
    </div>
  `;
}

/**
 * Рендерит хедер для авторизованного пользователя.
 *
 * @returns {string}
 */
function renderAuthorisedHeader(): string {
  const user = getSessionUser() as SessionUser;

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";

  const avatarSrc = !user?.avatarLink
    ? "/assets/img/default-avatar.png"
    : user.avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(user.avatarLink)
      ? user.avatarLink
      : `/image-proxy?url=${encodeURIComponent(user.avatarLink)}`;

  return `
    <div class="header__inner header__inner--authorised">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/icons/logo-auth.svg" alt="ARIS">
      </a>

      <label class="header__search-box search-field" aria-label="Поиск">
        <span class="header__search-icon search-field__icon" aria-hidden="true">
          <img src="/assets/img/icons/search.svg" alt="">
        </span>

        <input
          class="header__search-input search-field__input"
          type="text"
          placeholder="Поиск"
        >
      </label>

      <div class="header__user">
        <span class="header__username">${fullName}</span>

        <div class="header__avatar-wrap" data-header-user-menu>
          <button
            type="button"
            class="header__avatar-button"
            data-header-user-menu-toggle
            aria-label="Открыть меню профиля"
            aria-expanded="false"
          >
            <img
              class="header__avatar"
              src="${avatarSrc}"
              alt="${fullName}"
            >
          </button>

          <div class="header__user-menu" role="menu">
            <button type="button" class="header__user-menu-item" data-logout role="menuitem">
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Рендерит хедер страницы в зависимости от состояния авторизации пользователя.
 *
 * @returns {string}
 */
export function renderHeader(): string {
  const isAuthorised = getSessionUser() !== null;

  return `
    <header class="header">
      ${isAuthorised ? renderAuthorisedHeader() : renderGuestHeader()}
    </header>
  `;
}

/**
 * Инициализирует поведение хедера (обработчик выхода).
 *
 * @param {Document | HTMLElement} [root=document]
 * @returns {void}
 */
export function initHeader(root: Document | HTMLElement = document): void {
  const rootEl = root as Document & { __headerBound?: boolean };

  if (rootEl.__headerBound) return;

  root.addEventListener("click", async (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const menuToggle = target.closest("[data-header-user-menu-toggle]");
    if (menuToggle instanceof HTMLButtonElement) {
      const menuRoot = menuToggle.closest("[data-header-user-menu]");
      const shouldOpen = !menuRoot?.classList.contains("is-open");

      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });

      if (menuRoot instanceof HTMLElement) {
        menuRoot.classList.toggle("is-open", shouldOpen);
        menuToggle.setAttribute("aria-expanded", String(shouldOpen));
      }
      return;
    }

    const btn = target.closest("[data-logout]");
    if (!btn) {
      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });
      return;
    }

    try {
      await logoutUser();
      clearSessionUser();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  rootEl.__headerBound = true;
}
