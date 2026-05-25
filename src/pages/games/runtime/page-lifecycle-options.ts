/**
 * Фабрика lifecycle-опций страницы игр.
 *
 * Изолирует wiring runtime-зависимостей от page-слоя и возвращает свежий
 * объект опций для init/resize/unmount операций.
 */
import type { GamesPageLifecycleOptions } from "./page-lifecycle";

export type GamesPageLifecycleOptionsFactoryParams = Omit<
  GamesPageLifecycleOptions,
  "refreshCurrentRoomSilently"
> & {
  refreshCurrentRoomSilently: () => Promise<void> | void;
};

/**
 * Создаёт getter lifecycle-опций страницы игр.
 */
export function createGamesPageLifecycleOptionsFactory(
  params: GamesPageLifecycleOptionsFactoryParams,
): () => GamesPageLifecycleOptions {
  /**
   * Возвращает актуальные lifecycle-опции для runtime страницы.
   */
  return function getGamesPageLifecycleOptions(): GamesPageLifecycleOptions {
    return {
      ...params,
      refreshCurrentRoomSilently: () => {
        void params.refreshCurrentRoomSilently();
      },
    };
  };
}
