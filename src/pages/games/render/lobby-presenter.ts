/**
 * Presenter лобби игр.
 *
 * Собирает render-options для разделов лобби и оставляет page-слой без
 * знания о деталях форм, списка комнат и лидерборда.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { getRoomAuthorHref } from "./room/players";
import { renderLeaderboardPanel } from "./leaderboard";
import { renderCreateRoomForm, renderJoinByCodeForm, renderLobbyMenu } from "./lobby";
import { renderRoomsPanel, type RenderRoomsPanelOptions } from "./rooms";

type LobbyPresenterAdapter = {
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  getPlayerFullName: (player: GameRoom["players"][number]) => string;
  getRoomTitleValue: (room: GameRoom) => string;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
};

export type LobbyPresenterOptions = LobbyPresenterAdapter & {
  state: GamesPageState;
};

/**
 * Собирает данные и адаптеры для render-слоя списка комнат.
 */
export function getRoomsRenderOptions(options: LobbyPresenterOptions): RenderRoomsPanelOptions {
  return {
    rooms: options.state.rooms,
    roomsSearchQuery: options.state.roomsSearchQuery,
    roomsLoading: options.state.roomsLoading,
    roomsError: options.state.roomsError,
    roomsAutoRefreshEnabled: options.state.roomsAutoRefreshEnabled,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    getProfileHref: getRoomAuthorHref,
    getRoomTitleValue: options.getRoomTitleValue,
    shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
  };
}

/**
 * Рендерит текущий раздел лобби игр.
 */
export function renderLobbyContent(options: LobbyPresenterOptions): string {
  const { state } = options;

  if (state.lobbyMode === "create") {
    return renderCreateRoomForm({
      loading: state.loading,
      error: state.errorTarget === "form" ? state.error : "",
    });
  }

  if (state.lobbyMode === "rooms") {
    return renderRoomsPanel(getRoomsRenderOptions(options));
  }

  if (state.lobbyMode === "join") {
    return renderJoinByCodeForm({
      inviteCodeValue: state.joinInviteCodeValue,
      inviteCodeError: state.joinInviteCodeError,
      passwordValue: state.joinPasswordValue,
      passwordError: state.joinPasswordError,
      loading: state.loading,
    });
  }

  if (state.lobbyMode === "leaderboard") {
    return renderLeaderboardPanel({
      board: state.leaderboard,
      loading: state.leaderboardLoading,
      error: state.leaderboardError,
      getPlayerFullName: options.getPlayerFullName,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      getProfileHref: getRoomAuthorHref,
    });
  }

  return renderLobbyMenu();
}
