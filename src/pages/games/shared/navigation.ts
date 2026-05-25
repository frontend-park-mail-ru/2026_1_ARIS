/**
 * Возвращает roomId из параметров роутера.
 */
export function getRequestedRoomId(params?: Record<string, string>): string {
  return String(params?.roomId ?? "").trim();
}

/**
 * Нормализует pathname без хвостовых слешей.
 */
export function normaliseGamesPath(pathname: string): string {
  return pathname.replace(/\/+$/g, "") || "/";
}

/**
 * Проверяет, открыт ли каталог игр.
 */
export function isGamesCatalogRoute(pathname = window.location.pathname): boolean {
  return normaliseGamesPath(pathname) === "/games";
}

/**
 * Переводит браузерный URL на страницу комнаты.
 */
export function navigateToRoom(roomId: string): void {
  window.history.pushState({}, "", `/games/quiz/${encodeURIComponent(roomId)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Переводит браузерный URL в меню игр.
 */
export function navigateToGamesMenu(): void {
  window.history.pushState({}, "", "/games/quiz");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Заменяет текущий URL на меню игр без новой записи в history.
 */
export function replaceWithGamesMenuRoute(): void {
  window.history.replaceState({}, "", "/games/quiz");
}
