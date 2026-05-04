/**
 * Базовый компонент текстового поля.
 *
 * Используется для обычных инпутов и для паролей с переключателем видимости.
 */
import { renderEyeToggle } from "../eye-toggle/eye-toggle";

type InputState = "default" | "error";

type RenderInputOptions = {
  /** Тип HTML-поля. */
  type?: string;
  /** Имя поля. */
  name?: string;
  /** Placeholder поля. */
  placeholder?: string;
  /** Текущее значение. */
  value?: string;
  /** Визуальное состояние поля. */
  state?: InputState;
  /** Нужно ли показывать кнопку видимости пароля. */
  withToggle?: boolean;
  /** Видим ли пароль в текущий момент. */
  isVisible?: boolean;
  /** Заблокировано ли поле. */
  disabled?: boolean;
  /** Дополнительные CSS-классы. */
  className?: string;
  /** Произвольные HTML-атрибуты. */
  attributes?: string;
};

/**
 * Рендерит компонент поля ввода.
 *
 * @param {RenderInputOptions} [options={}] Параметры рендера.
 * @returns {string} HTML-разметка поля.
 *
 * @example
 * renderInput({ type: "password", withToggle: true });
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
