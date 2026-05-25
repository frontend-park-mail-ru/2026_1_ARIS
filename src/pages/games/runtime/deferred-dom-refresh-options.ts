/**
 * Deferred-доступ к DOM refresh options.
 *
 * Помогает composition root передать refresh getter ранним фабрикам до того,
 * как DOM adapters будут полностью собраны.
 */
import type { GamesDomRefreshOptions } from "./dom-refresh";

export type DomRefreshOptionsReader = () => GamesDomRefreshOptions;

/**
 * Создаёт отложенный getter DOM refresh options.
 */
export function createDeferredDomRefreshOptions() {
  let reader: DomRefreshOptionsReader | null = null;

  /**
   * Возвращает актуальные DOM refresh options.
   */
  function getDomRefreshOptions(): GamesDomRefreshOptions {
    if (!reader) {
      throw new Error("DOM refresh options reader is not initialized.");
    }
    return reader();
  }

  /**
   * Устанавливает reader DOM refresh options после сборки runtime adapters.
   */
  function setDomRefreshOptionsReader(nextReader: DomRefreshOptionsReader): void {
    reader = nextReader;
  }

  return {
    getDomRefreshOptions,
    setDomRefreshOptionsReader,
  };
}
