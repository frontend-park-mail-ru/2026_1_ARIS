export function renderInput({
  name,
  type = "text",
  placeholder = "",
  value = "",
  required = false,
  disabled = false,
} = {}) {
  return `
    <input
      class="input"
      name="${name}"
      type="${type}"
      placeholder="${placeholder}"
      value="${value}"
      ${required ? "required" : ""}
      ${disabled ? "disabled" : ""}
    />
  `;
}
