export function renderButton({
  text,
  variant = "primary",
  tag = "button",
  href = "#",
  type = "button",
  className = "",
  withDataLink = false,
}) {
  const classes = `button button--${variant}${className ? ` ${className}` : ""}`;

  if (tag === "link") {
    return `
      <a
        href="${href}"
        class="${classes}"
        ${withDataLink ? "data-link" : ""}
      >
        ${text}
      </a>
    `;
  }

  return `
    <button
      type="${type}"
      class="${classes}"
    >
      ${text}
    </button>
  `;
}
