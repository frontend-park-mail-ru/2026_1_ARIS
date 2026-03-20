/**
 * Renders a button or link component.
 *
 * @param {Object} options
 * @param {string} options.text - Button text content.
 * @param {"primary"|"secondary"|"surface"} [options.variant="primary"] - Visual style variant.
 * @param {"button"|"link"} [options.tag="button"] - HTML element type to render.
 * @param {string} [options.href="#"] - Link target when tag="link".
 * @param {"button"|"submit"|"reset"} [options.type="button"] - Button type attribute.
 * @param {string} [options.className=""] - Additional CSS classes.
 * @param {boolean} [options.withDataLink=false] - Whether to add data-link attribute.
 * @param {string} [options.attributes=""] - Additional raw HTML attributes.
 * @returns {string} HTML string of the rendered button or link.
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
}) {
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
