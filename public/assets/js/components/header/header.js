/**
 * Renders the application header.
 * @returns {string}
 */
export function renderHeader() {
  return `
    <header class="header">
      <div class="header__inner">
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
    </header>
  `;
}
