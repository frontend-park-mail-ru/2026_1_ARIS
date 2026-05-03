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

  const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadControllerAtLoad || isRefreshing) {
      return;
    }

    isRefreshing = true;
    window.location.reload();
  });

  const activateWaitingWorker = (worker: ServiceWorker | null | undefined): void => {
    worker?.postMessage({ type: "ARIS_SKIP_WAITING" });
  };

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        activateWaitingWorker(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              activateWaitingWorker(worker);
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.warn("[sw] Не удалось зарегистрировать service worker.", error);
      });
  });
}
