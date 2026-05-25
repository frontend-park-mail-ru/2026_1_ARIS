import type { GameRoom } from "../../../../../api/games";

export type GamePlayer = GameRoom["players"][number];

export type PlayerAvatarResolver = (player: GamePlayer) => string;

export type RenderGameProfileLinkOptions = {
  profileId: string;
  className: string;
  label: string;
  content: string;
  avatarUrl?: string;
  ariaLabel?: string;
};

export type RenderPlayerListOptions = {
  room: GameRoom;
  playerMenuProfileId: string;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
  getPlayerAvatarUrl: PlayerAvatarResolver;
};

export type RenderResultsPlayerCellOptions = {
  player: GamePlayer;
  playerLabel: string;
  getPlayerAvatarUrl: PlayerAvatarResolver;
};
