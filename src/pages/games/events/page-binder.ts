/**
 * Page-binder событий страницы игр.
 *
 * Собирает render-фоллбеки и lifecycle-тексты вокруг базового DOM binder, чтобы
 * page-слой передавал только готовые зависимости actions/render/runtime.
 */
import type { GameRoom } from "../../../api/games";
import type { LobbyPresenterOptions } from "../render/lobby-presenter";
import { getRoomsRenderOptions } from "../render/lobby-presenter";
import { renderRoomsList } from "../render/rooms";
import { getVoluntaryLeaveMessage, getVoluntaryLeaveReturnLabel } from "../room/lifecycle";
import { bindGamesPageEvents, type BindGamesPageEventsOptions, type GamesEventsRoot } from "./bind";

export type GamesPageEventBinderOptions = Omit<
  BindGamesPageEventsOptions,
  | "renderRoomsList"
  | "getVoluntaryLeaveMessage"
  | "getVoluntaryLeaveReturnLabel"
  | "getRoomTitleValue"
> & {
  getLobbyRenderOptions: () => LobbyPresenterOptions;
  getRoomTitleValue: (room: GameRoom) => string;
};

export type GamesPageEventBinderRoot = GamesEventsRoot;

/**
 * Создаёт binder событий страницы игр.
 */
export function createGamesPageEventBinder(options: GamesPageEventBinderOptions) {
  /**
   * Привязывает события страницы игр к DOM root.
   */
  return function bindGamesEvents(root: GamesPageEventBinderRoot): void {
    bindGamesPageEvents(root, {
      ...options,
      renderRoomsList: () =>
        renderRoomsList(getRoomsRenderOptions(options.getLobbyRenderOptions())),
      getVoluntaryLeaveMessage: () => getVoluntaryLeaveMessage(false),
      getVoluntaryLeaveReturnLabel: () => getVoluntaryLeaveReturnLabel(false),
      getRoomTitleValue: (room) => (room ? options.getRoomTitleValue(room) : ""),
    });
  };
}
