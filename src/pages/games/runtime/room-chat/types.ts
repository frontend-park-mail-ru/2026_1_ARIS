import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

export type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

export type RoomChatStateOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

export type LoadRoomChatMessagesOptions = {
  silent?: boolean;
  signal?: AbortSignal;
};

export type GamesRoomChatRuntime = {
  loadMessages: (roomId: string, options?: LoadRoomChatMessagesOptions) => Promise<void>;
  sync: () => void;
  stop: () => void;
  reset: () => void;
};

export type CreateGamesRoomChatRuntimeOptions = {
  getRoom: () => GameRoom | null;
  getSocketOpen: () => boolean;
  getMessages: () => GameRoomMessage[];
  getLoading: () => boolean;
  fetchMessages: (
    roomId: string,
    options: { limit: number; offset: number; signal?: AbortSignal },
  ) => Promise<GameRoomMessage[]>;
  getStoredSystemMessages: (roomId: string) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  hydrateAuthorAvatars: (room: GameRoom, messages: GameRoomMessage[]) => Promise<string[]>;
  prepareAvatarLinks: (avatarLinks: string[]) => void | Promise<void>;
  canRecoverAccess: (roomId: string) => boolean;
  recoverAccess: (roomId: string) => Promise<GameRoom | null>;
  clearAccessRecovery: (roomId: string) => void;
  setRecoveredRoom: (room: GameRoom) => void;
  setChatState: (patch: RoomChatStatePatch, options?: RoomChatStateOptions) => void;
  handleUnavailable: () => void | Promise<void>;
  formatError: (error: unknown, fallback: string) => string;
};
