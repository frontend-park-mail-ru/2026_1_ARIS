/**
 * Встраиваемый iframe-виджет техподдержки.
 *
 * Создаёт кнопку открытия и лениво монтирует iframe только в момент первого открытия,
 * чтобы техподдержка не утяжеляла начальную загрузку каждой страницы.
 */
let widgetInitialised = false;

/**
 * Инициализирует iframe-виджет техподдержки.
 *
 * @returns {void}
 */
export function initSupportIframe(): void {
  // Внутри iframe виджет не нужен, иначе получится рекурсивное вложение.
  if (window.self !== window.top) return;
  if (widgetInitialised) return;
  widgetInitialised = true;

  let iframe: HTMLIFrameElement | null = null;

  const ensureIframe = (): HTMLIFrameElement => {
    if (iframe) return iframe;

    iframe = document.createElement("iframe");
    iframe.src = "/support";
    iframe.className = "support-iframe";
    iframe.id = "support-iframe";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("title", "Техподдержка");
    iframe.setAttribute("loading", "lazy");
    document.body.appendChild(iframe);

    return iframe;
  };

  const btn = document.createElement("button");
  btn.className = "support-toggle-btn";
  btn.setAttribute("type", "button");
  btn.setAttribute("aria-label", "Открыть техподдержку");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "support-iframe");
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>
  `;

  document.body.appendChild(btn);

  const syncState = (isOpen: boolean): void => {
    const frame = isOpen ? ensureIframe() : iframe;
    frame?.classList.toggle("support-iframe--open", isOpen);
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.classList.toggle("support-toggle-btn--active", isOpen);
  };

  const closeIframe = (): void => syncState(false);

  btn.addEventListener("click", () => {
    const isOpen = !(iframe?.classList.contains("support-iframe--open") ?? false);
    syncState(isOpen);
  });

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.type === "support-widget-close") {
      closeIframe();
    }
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && iframe?.classList.contains("support-iframe--open")) {
      closeIframe();
    }
  });
}
