/**
 * Renders the application header.
 * @returns {string}
 */
export function renderHeader() {
  return `
    <header class="header">
      <a href="/feed" data-link class="header__logo-link" aria-label="На главную">
        <img
          class="header__logo"
          src="/assets/img/logo.svg"
          alt="АРИС"
        >
      </a>

      <div class="header__left-filler" aria-hidden="true"></div>

      <label class="header__search-box" aria-label="Поиск">
        <input
          class="header__search-input"
          type="text"
          placeholder="Поиск"
        >
      </label>

      <div class="header__right-filler" aria-hidden="true"></div>

      <div class="header__user">
        <span class="header__username">Сергей Шульгиненко</span>
        <div class="header__avatar" aria-hidden="true"></div>
      </div>
    </header>
  `;
}
