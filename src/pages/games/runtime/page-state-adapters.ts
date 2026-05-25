/**
 * State/DOM adapters страницы игр.
 *
 * Собирает updater-функции состояния и отложенное подключение DOM refresh
 * options, чтобы entrypoint не управлял порядком инициализации вручную.
 */
import type { GamesPageState } from "../state/store";
import { createDeferredDomRefreshOptions } from "./deferred-dom-refresh-options";
import { createGamesDomUpdaters } from "./dom-updaters";
import type { GamesPageDomAdapters } from "./page-dom-adapters";

export type GamesPageStateAdaptersOptions = {
  patchGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Создаёт state/DOM adapters страницы игр.
 */
export function createGamesPageStateAdapters(options: GamesPageStateAdaptersOptions) {
  const deferredDomRefreshOptions = createDeferredDomRefreshOptions();
  const updaters = createGamesDomUpdaters({
    getDomRefreshOptions: deferredDomRefreshOptions.getDomRefreshOptions,
    patchGamesState: options.patchGamesState,
  });

  /**
   * Подключает DOM adapters после создания runtime-слоя.
   */
  function connectDomAdapters(
    domAdapters: Pick<GamesPageDomAdapters, "getDomRefreshOptions">,
  ): void {
    deferredDomRefreshOptions.setDomRefreshOptionsReader(domAdapters.getDomRefreshOptions);
  }

  return {
    ...updaters,
    connectDomAdapters,
  };
}

export type GamesPageStateAdapters = ReturnType<typeof createGamesPageStateAdapters>;
