import type { GameRoom } from "../../../../../api/games";

export type GamePlayer = GameRoom["players"][number];

export type GamesAvatarSessionUser = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  login?: string;
  avatarLink?: string;
};

export type GameRoomAvatarServiceOptions = {
  getCurrentProfileId: () => string;
  getCurrentPlayer: (room: GameRoom | null) => GamePlayer | null;
  getSessionUser: () => GamesAvatarSessionUser | null | undefined;
  loadAvatarUrlById?: (avatarId: string, signal?: AbortSignal) => Promise<string>;
  loadProfile: (profileId: string, signal?: AbortSignal) => Promise<unknown>;
  rememberRoomTitle?: (roomId: string, title: string) => void;
};

export type GameRoomAvatarCaches = {
  gameAvatarLinkCache: Map<string, string>;
  gameAvatarMediaUrlCache: Map<string, string>;
  gameRoomChatAuthorAvatarCache: Map<string, string>;
  gameRoomChatAuthorAvatarRequestCache: Map<string, Promise<string>>;
  gamePlayerGenderCache: Map<string, GamePlayer["gender"]>;
};
