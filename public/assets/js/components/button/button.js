export function renderButton({ text, variant = "primary" }) {
  return `
    <button class="button button--${variant}">
      ${text}
    </button>
  `;
}