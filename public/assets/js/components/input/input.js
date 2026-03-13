import { renderEyeToggle } from "../eye-toggle/eye-toggle.js";

/**
 * Renders an input component.
 * @param {Object} [options={}]
 * @param {string} [options.type="text"]
 * @param {string} [options.name=""]
 * @param {string} [options.placeholder=""]
 * @param {string} [options.value=""]
 * @param {string} [options.state="default"]
 * @param {boolean} [options.withToggle=false]
 * @param {boolean} [options.isVisible=false]
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.className=""]
 * @param {string} [options.attributes=""]
 * @returns {string}
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
