/**
 * Скелетон страницы игр.
 *
 * Содержит разметку загрузочного состояния каталога, комнаты ожидания и игровой комнаты.
 */
import { renderHeaderSkeleton } from "../../../components/header/header-skeleton";
import { renderSidebar } from "../../../components/sidebar/sidebar";
import { renderGameCatalogSkeleton } from "./skeleton/catalog";
import { renderGameLobbySkeleton } from "./skeleton/lobby";
import { normaliseGamesSkeletonPath } from "./skeleton/path";
import { renderGameRoomSkeleton } from "./skeleton/room";

/**
 * Выбирает skeleton-контент по текущему маршруту игр.
 */
function renderGamesSkeletonContent(path: string): string {
  const normalisedPath = normaliseGamesSkeletonPath(path);

  if (normalisedPath === "/games") {
    return renderGameCatalogSkeleton();
  }

  if (normalisedPath === "/games/quiz") {
    return renderGameLobbySkeleton();
  }

  return renderGameRoomSkeleton();
}

/**
 * Рендерит shell страницы игр в состоянии загрузки.
 */
export function renderGamesSkeleton(path = "/games"): string {
  return `
    <div class="app-page app-page--content-wide">
      ${renderHeaderSkeleton()}
      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${renderGamesSkeletonContent(path)}
        </section>
      </main>
    </div>
  `;
}
