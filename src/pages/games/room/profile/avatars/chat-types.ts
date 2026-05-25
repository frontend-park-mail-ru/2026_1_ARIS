import type { GameRoomAvatarCaches, GameRoomAvatarServiceOptions, GamePlayer } from "./types";

export type RoomChatAvatarServiceOptions = Pick<
  GameRoomAvatarServiceOptions,
  "getCurrentProfileId" | "getCurrentPlayer" | "getSessionUser" | "loadProfile"
> & {
  caches: GameRoomAvatarCaches;
  getPlayerAvatarUrl: (player: GamePlayer) => string;
};
