/**
 * Render-обвязка страницы игр.
 *
 * Собирает общий app layout вокруг игрового shell и отделяет страницу от
 * деталей header/sidebar.
 */
import type { GameRoom } from "../../../api/games";
import { renderHeader } from "../../../components/header/header";
import { renderSidebar } from "../../../components/sidebar/sidebar";

export type RenderGamesPageShellOptions = {
  room: GameRoom | null;
  shell: string;
  playersRail: string;
  roomChat: string;
};

/**
 * Рендерит полный shell страницы игр с учетом режима комнаты.
 */
export function renderGamesPageShell(options: RenderGamesPageShellOptions): string {
  if (options.room && options.room.status !== "waiting") {
    return `
      <div class="app-page app-page--content-wide app-page--game-room">
        ${renderHeader()}
        <main class="app-layout app-layout--game-room">
          <aside class="app-layout__left games-room-layout__players" data-games-room-players-rail>
            ${options.playersRail}
          </aside>
          <section class="app-layout__center games-room-layout__stage">
            ${options.shell}
          </section>
          <aside class="app-layout__right games-room-layout__chat" data-games-external-chat>
            ${options.roomChat}
          </aside>
        </main>
      </div>
    `;
  }

  return `
    <div class="app-page app-page--content-wide">
      ${renderHeader()}
      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${options.shell}
        </section>
      </main>
    </div>
  `;
}
