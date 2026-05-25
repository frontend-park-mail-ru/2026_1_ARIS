import type { GameRoom } from "../../../../api/games";

export type GameProfileLinkOptions = {
  profileId: string;
  className: string;
  label: string;
  content: string;
  avatarUrl?: string;
  ariaLabel?: string;
};

export type RenderGameScoreboardOptions = {
  room: GameRoom;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  renderProfileLink: (options: GameProfileLinkOptions) => string;
};

export type RenderGamePlayersRailOptions = RenderGameScoreboardOptions & {
  loading: boolean;
};
