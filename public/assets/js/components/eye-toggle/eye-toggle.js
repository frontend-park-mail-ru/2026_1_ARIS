/**
 * Renders a password visibility toggle button (eye icon).
 *
 * @param {Object} [options]
 * @param {boolean} [options.isVisible=false] - Whether the password is currently visible.
 * @param {string} [options.className=""] - Additional CSS classes for the button.
 * @returns {string} HTML string of the eye toggle button.
 */
export function renderEyeToggle({ isVisible = false, className = "" } = {}) {
  const iconSrc = isVisible
    ? "assets/img/icons/eye-on-thin.svg"
    : "assets/img/icons/eye-off-thin.svg";

  const stateClass = isVisible ? "eye-toggle--visible" : "eye-toggle--hidden";

  return `
    <button
      type="button"
      tabindex="-1"
      class="eye-toggle ${stateClass}${className ? ` ${className}` : ""}"
      aria-label="${isVisible ? "Скрыть пароль" : "Показать пароль"}"
      aria-pressed="${isVisible ? "true" : "false"}"
    >
      <img class="eye-toggle__icon" src="${iconSrc}" alt="">
    </button>
  `;
}
