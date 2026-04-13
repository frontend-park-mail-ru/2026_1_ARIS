import { renderEyeToggle } from "../eye-toggle/eye-toggle";

type InputState = "default" | "error";

type RenderInputOptions = {
  type?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  state?: InputState;
  withToggle?: boolean;
  isVisible?: boolean;
  disabled?: boolean;
  className?: string;
  attributes?: string;
};

/**
 * Renders an input component.
 *
 * @param {RenderInputOptions} [options={}]
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
}: RenderInputOptions = {}): string {
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