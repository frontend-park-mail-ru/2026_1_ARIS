import { renderEyeToggle } from "../eye-toggle/eye-toggle.js";

/**
 * Renders an input component.
 *
 * @param {Object} [options={}]
 * @param {string} [options.type="text"] - Input type attribute.
 * @param {string} [options.name=""] - Input name attribute.
 * @param {string} [options.placeholder=""] - Input placeholder text.
 * @param {string} [options.value=""] - Input value.
 * @param {"default"|"error"} [options.state="default"] - Visual state modifier.
 * @param {boolean} [options.withToggle=false] - Whether to render password visibility toggle.
 * @param {boolean} [options.isVisible=false] - Whether password is currently visible.
 * @param {boolean} [options.disabled=false] - Whether the input is disabled.
 * @param {string} [options.className=""] - Additional CSS classes for the root input element.
 * @param {string} [options.attributes=""] - Additional raw HTML attributes for the input element.
 * @returns {string} HTML string of the rendered input.
 */
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
  const isPassword = type === "password";
  const inputType = isPassword && isVisible ? "text" : type;

  const classes = [
    "input",
    `input--${state}`,
    withToggle ? "input--with-toggle" : "",
    isPassword ? "input--password" : "",
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
