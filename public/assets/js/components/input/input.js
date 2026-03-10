import { renderEyeToggle } from "../eye-toggle/eye-toggle.js";

export function renderInput({
  type = "text",
  name = "",
  placeholder = "",
  value = "",
  state = "default",
  withToggle = false,
  isVisible = false,
  disabled = false,
  className = "",
  attributes = "",
} = {}) {
  const inputType = type === "password" && isVisible ? "text" : type;

  const classes = [
    "input",
    `input--${state}`,
    withToggle ? "input--with-toggle" : "",
    type === "password" ? "input--password" : "",
    disabled ? "input--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <label class="${classes}">
      <input
        class="input__field"
        type="${inputType}"
        name="${name}"
        placeholder="${placeholder}"
        value="${value}"
        ${disabled ? "disabled" : ""}
        ${attributes}
      >
      ${
        withToggle
          ? renderEyeToggle({
              isVisible,
              className: "input__toggle",
            })
          : ""
      }
    </label>
  `;
}
