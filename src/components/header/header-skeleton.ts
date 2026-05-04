/**
 * Скелетон шапки приложения.
 *
 * Повторяет структуру header, чтобы при асинхронном старте не прыгал layout.
 */
import { getSessionUser } from "../../state/session";
import { t } from "../../state/i18n";
import { formatPersonName } from "../../utils/display-name";

/**
 * Рендерит скелетон шапки для гостя или авторизованного пользователя.
 *
 * @returns {string} HTML-разметка скелетона.
 */
export function renderHeaderSkeleton(): string {
  const user = getSessionUser();
  const fullName = user ? formatPersonName(user.firstName, user.lastName) : "";

  if (!user) {
    return `
      <header class="header">
        <div class="header__inner header__inner--guest">
          <a href="/feed" data-link class="header__logo-link">
            <img class="header__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">
          </a>

          <div class="header__guest-actions">
            <button type="button" class="button button--primary button--large" data-open-auth-modal="register">
              ${t("header.register")}
            </button>

            <button type="button" class="button button--secondary button--small" data-open-auth-modal="login">
              ${t("header.login")}
            </button>
          </div>
        </div>
      </header>
    `;
  }

  return `
    <header class="header">
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
          >
        </label>

        <div class="header__user">
          ${
            fullName
              ? `<span class="header__username">${fullName}</span>`
              : `<span class="skeleton header__username" style="display:block;height:16px"></span>`
          }
          <div class="header__avatar-wrap">
            <span class="header__avatar avatar-skeleton skeleton" role="img" aria-label="${t("profile.profile")}"></span>
          </div>
        </div>
      </div>
    </header>
  `;
}
