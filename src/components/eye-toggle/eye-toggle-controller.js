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

      if (icon) {
        icon.src = "assets/img/icons/eye-off-thin.svg";
      }
    } else {
      input.type = "text";
      toggle.setAttribute("aria-pressed", "true");

      if (icon) {
        icon.src = "assets/img/icons/eye-on-thin.svg";
      }
    }
  });

  root.__eyeToggleBound = true;
}
