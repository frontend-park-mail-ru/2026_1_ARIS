import { renderLobbyContent as renderLobbyContentView } from "../lobby-presenter";
import type { GamesPageRendererOptions } from "./types";

type PageLobbyRendererOptions = Pick<
  GamesPageRendererOptions,
  | "getState"
  | "getPlayerAvatarUrl"
  | "getPlayerFullName"
  | "getRoomTitleValue"
  | "shouldBlockFullRoomJoin"
>;

/**
 * Создаёт render-адаптер лобби страницы игр.
 */
export function createPageLobbyRenderer(options: PageLobbyRendererOptions) {
  /**
   * Собирает зависимости presenter лобби игр.
   */
  function getLobbyRenderOptions() {
    return {
      state: options.getState(),
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      getPlayerFullName: options.getPlayerFullName,
      getRoomTitleValue: options.getRoomTitleValue,
      shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
    };
  }

  /**
   * Рендерит активное содержимое лобби.
   */
  function renderLobbyContent(): string {
    return renderLobbyContentView(getLobbyRenderOptions());
  }

  return {
    getLobbyRenderOptions,
    renderLobbyContent,
  };
}
