/**
 * Нормализует путь для выбора нужного skeleton-состояния.
 */
export function normaliseGamesSkeletonPath(path: string): string {
  return (path || "/").replace(/\/+$/g, "") || "/";
}
