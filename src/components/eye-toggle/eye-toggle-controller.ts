type EyeToggleRoot = (Document | HTMLElement) & {
  __eyeToggleBound?: boolean;
};

/**
 * Инициализирует обработчики переключения видимости пароля.
 *
 * @param {Document | HTMLElement} [root=document]
 * @returns {void}
 */
export function initEyeToggle(root: Document | HTMLElement = document): void {
  const bindableRoot = root as EyeToggleRoot;
  if (bindableRoot.__eyeToggleBound) return;

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const toggle = target.closest(".eye-toggle");
    if (!toggle) return;

    const inputWrapper = toggle.closest(".input");
    if (!inputWrapper) return;

    const input = inputWrapper.querySelector(".input__field");
    if (!(input instanceof HTMLInputElement)) return;

    const icon = toggle.querySelector(".eye-toggle__icon");
    const isVisible = input.type === "text";

    if (isVisible) {
      input.type = "password";
      toggle.setAttribute("aria-pressed", "false");

      if (icon instanceof HTMLImageElement) {
        icon.src = "assets/img/icons/eye-off-thin.svg";
      }
    } else {
      input.type = "text";
      toggle.setAttribute("aria-pressed", "true");

      if (icon instanceof HTMLImageElement) {
        icon.src = "assets/img/icons/eye-on-thin.svg";
      }
    }
  });

  bindableRoot.__eyeToggleBound = true;
}
