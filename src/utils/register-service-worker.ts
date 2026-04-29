/**
 * Регистрация service worker приложения.
 */
/**
 * Регистрирует service worker после загрузки страницы.
 *
 * @returns {void}
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch((error: unknown) => {
        console.warn("[sw] Не удалось зарегистрировать service worker.", error);
      });
  });
}
