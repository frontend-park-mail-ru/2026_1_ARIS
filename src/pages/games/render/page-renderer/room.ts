import type { GameRoom } from "../../../../api/games";
import { renderRoomChatPresenter } from "../../chat/presenter";
import { getPrimaryGameCatalogItem } from "../../shared/registry";
import type { GamesErrorTarget } from "../../state/store";
import { renderProtectedGameProfileLink } from "../room/players";
import { renderRoomPanelPresenter } from "../room/presenter";
import type { GamesPageRendererOptions } from "./types";

type PageRoomRendererOptions = Pick<
  GamesPageRendererOptions,
  | "getState"
  | "getCurrentProfileId"
  | "getPlayerAvatarUrl"
  | "getRoomTitleValue"
  | "getRoomPasswordDisplayValue"
  | "getRoomChatAuthorName"
  | "getRoomChatAuthorFirstName"
  | "getRoomChatAuthorAvatar"
  | "getRoomChatPlayer"
> & {
  renderPauseAction: (room: GameRoom) => string;
  renderGamePlay: (room: GameRoom) => string;
  renderInlineError: (target: GamesErrorTarget) => string;
};

/**
 * Создаёт render-адаптер комнаты страницы игр.
 */
export function createPageRoomRenderer(options: PageRoomRendererOptions) {
  /**
   * Рендерит чат комнаты.
   */
  function renderRoomChat(room: GameRoom): string {
    return renderRoomChatPresenter({
      state: options.getState(),
      room,
      getRoomChatAuthorName: options.getRoomChatAuthorName,
      getRoomChatAuthorFirstName: options.getRoomChatAuthorFirstName,
      getRoomChatAuthorAvatar: options.getRoomChatAuthorAvatar,
      getRoomChatPlayer: options.getRoomChatPlayer,
      renderProfileLink: renderProtectedGameProfileLink,
    });
  }

  /**
   * Рендерит панель текущей комнаты.
   */
  function renderRoomPanel(room: GameRoom): string {
    return renderRoomPanelPresenter({
      state: options.getState(),
      room,
      game: getPrimaryGameCatalogItem(),
      currentProfileId: options.getCurrentProfileId(),
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      getRoomTitleValue: (room) => options.getRoomTitleValue(room),
      getRoomPasswordDisplayValue: options.getRoomPasswordDisplayValue,
      renderPauseAction: options.renderPauseAction,
      renderGamePlay: options.renderGamePlay,
      renderInlineError: options.renderInlineError,
    });
  }

  return {
    renderRoomChat,
    renderRoomPanel,
  };
}
