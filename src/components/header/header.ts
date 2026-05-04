/**
 * Шапка приложения.
 *
 * Отвечает за:
 * - рендер гостевого и авторизованного состояния
 * - отображение имени и аватара текущего пользователя
 * - меню профиля и выход из аккаунта
 *
 * Не отвечает за загрузку данных пользователя: header работает поверх `session`.
 */
import { clearSessionUser, getSessionUser } from "../../state/session";
import { renderButton } from "../button/button";
import { logoutUser } from "../../api/auth";
import { renderAvatarMarkup, escapeHtml } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
import { t } from "../../state/i18n";

/**
 * Минимальный срез данных пользователя, который нужен header.
 */
type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
} | null;

/**
 * Рендерит аватар в размерах, согласованных с дизайном header.
 *
 * @param {string} className CSS-класс элемента аватара.
 * @param {string} label Имя пользователя для `alt`.
 * @param {string} [avatarLink] Ссылка на изображение профиля.
 * @returns {string} HTML-разметка аватара.
 */
function renderHeaderAvatar(className: string, label: string, avatarLink?: string): string {
  return renderAvatarMarkup(className, label, avatarLink, {
    width: 56,
    height: 56,
    loading: "eager",
  });
}

/**
 * Рендерит хедер для гостя.
 *
 * @returns {string} HTML-разметка гостевой шапки.
 */
function renderGuestHeader(): string {
  return `
    <div class="header__inner header__inner--guest">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">
      </a>

      <div class="header__guest-actions">
        ${renderButton({
          text: t("header.register"),
          variant: "primary",
          tag: "button",
          type: "button",
          className: "button--large",
          attributes: 'data-open-auth-modal="register"',
        })}

        ${renderButton({
          text: t("header.login"),
          variant: "secondary",
          tag: "button",
          type: "button",
          className: "button--small",
          attributes: 'data-open-auth-modal="login"',
        })}
      </div>

      <a href="/login" data-open-auth-modal="login" class="header__user">
        <span class="header__username">${t("header.yourPage")}</span>
        ${renderHeaderAvatar("header__avatar", t("header.guestProfile"))}
      </a>
    </div>
  `;
}

/**
 * Рендерит хедер для авторизованного пользователя.
 *
 * @returns {string} HTML-разметка авторизованной шапки.
 */
function getHeaderSearchValue(): string {
  if (typeof window === "undefined") return "";
  if (window.location.pathname !== "/search") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function renderAuthorisedHeader(): string {
  const user = getSessionUser() as SessionUser;

  const fullName = user ? formatPersonName(user.firstName, user.lastName) : "";
  const searchValue = getHeaderSearchValue();

  return `
    <div class="header__inner header__inner--authorised">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">
      </a>

      <label class="header__search-box search-field" aria-label="${t("header.search")}">
        <span class="header__search-icon search-field__icon" aria-hidden="true">
          <img src="/assets/img/icons/search.svg" alt="">
        </span>

        <input
          class="header__search-input search-field__input"
          type="text"
          placeholder="${t("header.search")}"
          data-header-search
          value="${escapeHtml(searchValue)}"
        >
      </label>

      <div class="header__user">
        <span class="header__username">${fullName}</span>

        <div class="header__avatar-wrap" data-header-user-menu>
          <button
            type="button"
            class="header__avatar-button"
            data-header-user-menu-toggle
            aria-label="${t("header.openProfileMenu")}"
            aria-expanded="false"
          >
            ${renderHeaderAvatar("header__avatar", fullName || t("header.profile"), user?.avatarLink)}
          </button>

          <div class="header__user-menu" role="menu">
            <button type="button" class="header__user-menu-item" data-support-open role="menuitem">
              ${t("header.help")}
            </button>
            <button type="button" class="header__user-menu-item" data-logout role="menuitem">
              ${t("header.logout")}
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
 * @returns {string} HTML-разметка шапки.
 *
 * @example
 * root.innerHTML = renderHeader();
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
 * Инициализирует интерактивное поведение header.
 *
 * @param {Document | HTMLElement} [root=document] Корень, внутри которого живёт header.
 * @returns {void}
 *
 * @example
 * initHeader(document);
 */
export function initHeader(root: Document | HTMLElement = document): void {
  const rootEl = root as Document & { __headerBound?: boolean };

  if (rootEl.__headerBound) return;

  root.addEventListener("keydown", (event: Event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-header-search]")) return;
    const q = target.value.trim();
    if (!q) return;
    window.history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

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

    const supportButton = target.closest("[data-support-open]");
    if (supportButton instanceof HTMLButtonElement) {
      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });
      window.dispatchEvent(new CustomEvent("support-widget-open"));
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
      console.error("Ошибка выхода из аккаунта:", error);
    }
  });

  rootEl.__headerBound = true;
}
