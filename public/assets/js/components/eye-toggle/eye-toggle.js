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
