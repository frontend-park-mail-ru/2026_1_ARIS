import type { GameRoom } from "../../../../api/games";

export type RoomsRenderAdapter = {
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  getProfileHref: (profileId: string) => string;
  getRoomTitleValue: (room: GameRoom) => string;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
};

export type RenderRoomsPanelOptions = RoomsRenderAdapter & {
  rooms: GameRoom[];
  roomsSearchQuery: string;
  roomsLoading: boolean;
  roomsError: string;
  roomsAutoRefreshEnabled: boolean;
};
