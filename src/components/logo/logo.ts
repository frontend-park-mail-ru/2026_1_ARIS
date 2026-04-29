/**
 * Рендерит логотип приложения.
 *
 * @returns {string} HTML-разметка логотипа со ссылкой на ленту.
 */
export function renderLogo(): string {
  return `
    <a href="/feed" data-link class="logo">
      <img class="logo__image" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS logo">
    </a>
  `;
}
