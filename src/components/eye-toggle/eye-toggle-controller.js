/**
 * Initializes password visibility toggle handlers.
 *
 * Adds a delegated click handler that:
 * - finds the clicked eye toggle button,
 * - finds the related password input inside the same `.input`,
 * - switches the input type between `password` and `text`,
 * - updates `aria-pressed`,
 * - swaps the eye icon.
 *
 * The handler is bound only once per root.
 *
 * @param {Document|HTMLElement} [root=document] - Root node for delegated event handling.
 * @returns {void}
 */
export function initEyeToggle(root = document) {
  if (root.__eyeToggleBound) return;

  root.addEventListener("click", (event) => {
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

  root.__eyeToggleBound = true;
}
