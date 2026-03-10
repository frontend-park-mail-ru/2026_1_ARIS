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
