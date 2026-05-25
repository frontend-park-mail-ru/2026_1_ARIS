/**
 * Bootstrap страницы игр.
 *
 * Связывает публичный init и window lifecycle-события с runtime lifecycle
 * функциями, не смешивая это с composition root страницы.
 */
import {
  initGamesPageLifecycle,
  syncGamesPageResize,
  teardownGamesPageLifecycleWhenUnmounted,
  type GamesPageLifecycleOptions,
} from "./page-lifecycle";

export type GamesPageBootstrapOptions = {
  getLifecycleOptions: () => GamesPageLifecycleOptions;
};

export type GamesPageBootstrap = ReturnType<typeof createGamesPageBootstrap>;

/**
 * Создаёт bootstrap-адаптер страницы игр.
 */
export function createGamesPageBootstrap(options: GamesPageBootstrapOptions) {
  /**
   * Инициализирует runtime страницы игр на указанном root.
   */
  function init(root: Document | HTMLElement = document): void {
    initGamesPageLifecycle(root, options.getLifecycleOptions());
  }

  /**
   * Синхронизирует страницу игр после изменения viewport.
   */
  function syncResize(): void {
    syncGamesPageResize(options.getLifecycleOptions());
  }

  /**
   * Останавливает runtime, если страница игр размонтирована.
   */
  function teardownWhenUnmounted(): void {
    teardownGamesPageLifecycleWhenUnmounted(options.getLifecycleOptions());
  }

  return {
    init,
    syncResize,
    teardownWhenUnmounted,
  };
}

/**
 * Подключает window-события, управляющие runtime страницы игр.
 */
export function bindGamesPageBootstrapEvents(bootstrap: GamesPageBootstrap): void {
  window.addEventListener("resize", () => {
    bootstrap.syncResize();
  });

  window.addEventListener("apprender", () => {
    bootstrap.teardownWhenUnmounted();
  });
}
