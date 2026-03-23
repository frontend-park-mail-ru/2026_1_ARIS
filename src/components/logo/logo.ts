/**
 * Renders the application logo.
 *
 * @returns {string}
 */
export function renderLogo(): string {
  return `
    <a href="/feed" data-link class="logo">
      <img class="logo__image" src="/assets/img/logo.svg" alt="ARIS logo">
    </a>
  `;
}