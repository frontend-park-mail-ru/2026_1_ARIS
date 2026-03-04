export function renderButton({
  text,
  variant = "primary",
  type = "button",
  disabled = false,
  attrs = "",
  block = false,
} = {}) {
  const blockClass = block ? " button--block" : "";

  return `
    <button
      class="button button--${variant}${blockClass}"
      type="${type}"
      ${disabled ? "disabled" : ""}
      ${attrs}
    >
      ${text}
    </button>
  `;
}
