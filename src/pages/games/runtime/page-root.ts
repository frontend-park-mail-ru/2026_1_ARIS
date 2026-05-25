/**
 * DOM-root страницы игр.
 *
 * Хранит текущий root отдельно от composition root, чтобы runtime и render
 * адаптеры получали его через единый getter.
 */
export type GamesPageRoot = Document | HTMLElement | null;

/**
 * Создаёт контейнер DOM-root страницы игр.
 */
export function createGamesPageRoot() {
  let root: GamesPageRoot = null;

  /**
   * Возвращает текущий DOM-root страницы игр.
   */
  function getRoot(): GamesPageRoot {
    return root;
  }

  /**
   * Сохраняет текущий DOM-root страницы игр.
   */
  function setRoot(nextRoot: Document | HTMLElement): void {
    root = nextRoot;
  }

  return {
    getRoot,
    setRoot,
  };
}
