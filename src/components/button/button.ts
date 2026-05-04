/**
 * Базовый компонент кнопки приложения.
 */
type ButtonVariant = "primary" | "secondary" | "surface";
type ButtonTag = "button" | "link";
type ButtonType = "button" | "submit" | "reset";

type RenderButtonOptions = {
  /** Текст кнопки или ссылки. */
  text: string;
  /** Визуальный вариант компонента. */
  variant?: ButtonVariant;
  /** Тип тега: кнопка или ссылка. */
  tag?: ButtonTag;
  /** Адрес ссылки, если `tag === "link"`. */
  href?: string;
  /** Тип HTML-кнопки. */
  type?: ButtonType;
  /** Дополнительные CSS-классы. */
  className?: string;
  /** Нужно ли добавить `data-link` для клиентского роутера. */
  withDataLink?: boolean;
  /** Произвольные HTML-атрибуты. */
  attributes?: string;
};

/**
 * Рендерит компонент кнопки или ссылки.
 *
 * @param {RenderButtonOptions} options Параметры рендера.
 * @returns {string} HTML-разметка кнопки или ссылки.
 */
export function renderButton({
  text,
  variant = "primary",
  tag = "button",
  href = "#",
  type = "button",
  className = "",
  withDataLink = false,
  attributes = "",
}: RenderButtonOptions): string {
  const classes = `button button--${variant}${className ? ` ${className}` : ""}`;
  const dataLinkAttr = withDataLink ? "data-link" : "";
  const extraAttrs = [dataLinkAttr, attributes].filter(Boolean).join(" ");

  if (tag === "link") {
    return `
      <a
        href="${href}"
        class="${classes}"
        ${extraAttrs}
      >
        ${text}
      </a>
    `;
  }

  return `
    <button
      type="${type}"
      class="${classes}"
      ${extraAttrs}
    >
      ${text}
    </button>
  `;
}
