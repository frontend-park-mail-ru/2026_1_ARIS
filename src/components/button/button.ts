type ButtonVariant = "primary" | "secondary" | "surface";
type ButtonTag = "button" | "link";
type ButtonType = "button" | "submit" | "reset";

type RenderButtonOptions = {
  text: string;
  variant?: ButtonVariant;
  tag?: ButtonTag;
  href?: string;
  type?: ButtonType;
  className?: string;
  withDataLink?: boolean;
  attributes?: string;
};

/**
 * Renders a button or link component.
 *
 * @param {RenderButtonOptions} options
 * @returns {string}
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