import type { GamesPageState } from "../store";

export type GamesStatePatch = Partial<GamesPageState>;

export type RoomUnavailablePatchOptions = {
  lobbyMode: GamesPageState["lobbyMode"];
  message: string;
  messageReturnRoomId?: string;
  messageReturnInviteCode?: string;
  messageReturnPassword?: string;
  messageReturnRoomLabel?: string;
};
