/**
 * Рендерит логотип приложения.
 *
 * @returns {string}
 */
export function renderLogo(): string {
  return `
    <a href="/feed" data-link class="logo">
      <img class="logo__image" src="/assets/img/logo.png" alt="ARIS logo">
    </a>
  `;
}
