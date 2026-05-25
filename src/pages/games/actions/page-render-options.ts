/**
 * Фабрика render-опций страницы игр.
 *
 * Скрывает wiring initial-state загрузки и guest fallback за тонким публичным
 * входом `renderGames`.
 */
import type { RenderGamesPageOptions } from "./page-render";

export type GamesPageRenderOptionsParams = Omit<RenderGamesPageOptions, "renderGuestPage"> & {
  renderGuestPage?: RenderGamesPageOptions["renderGuestPage"];
};

/**
 * Создаёт render-опции страницы игр.
 */
export function createGamesPageRenderOptions(
  params: GamesPageRenderOptionsParams,
): RenderGamesPageOptions {
  /**
   * Рендерит guest fallback через feed-страницу.
   */
  async function renderGuestPage(signal?: AbortSignal): Promise<string> {
    if (params.renderGuestPage) {
      return params.renderGuestPage(signal);
    }
    return (await import("../../feed/feed")).renderFeed(undefined, signal);
  }

  return {
    ...params,
    renderGuestPage,
  };
}
