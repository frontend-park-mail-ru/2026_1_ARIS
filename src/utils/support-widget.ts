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

  const syncState = (isOpen: boolean): void => {
    const frame = isOpen ? ensureIframe() : iframe;
    frame?.classList.toggle("support-iframe--open", isOpen);
  };

  const closeIframe = (): void => syncState(false);

  window.addEventListener("support-widget-toggle", () => {
    syncState(!(iframe?.classList.contains("support-iframe--open") ?? false));
  });

  window.addEventListener("support-widget-open", () => {
    syncState(true);
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
