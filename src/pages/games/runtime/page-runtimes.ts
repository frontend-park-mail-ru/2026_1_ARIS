import type {
  GameRoom,
  GameRoomMessage,
  GameRoomSocketHandlers,
  GameRoomSocketSubscription,
} from "../../../api/games";
import type { GamesLobbyMode, GamesPageState } from "../state/store";
import { createGamesCountdownRuntime, type GamesCountdownRuntime } from "./countdown";
import { createGamesPollingRuntime, type GamesPollingRuntime } from "./polling";
import {
  createGamesRoomChatRuntime,
  type GamesRoomChatRuntime,
  type RoomChatStateOptions,
} from "./room-chat";
import { createGamesRoomSocketRuntime, type GamesRoomSocketRuntime } from "./room-socket";

type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

export type GamesPageRuntimes = {
  countdown: GamesCountdownRuntime;
  roomChat: GamesRoomChatRuntime;
  roomSocket: GamesRoomSocketRuntime;
  roomsAutoRefresh: GamesPollingRuntime;
  roomStateRefresh: GamesPollingRuntime;
};

export type CreateGamesPageRuntimesOptions = {
  getRoot: () => Document | HTMLElement | null;
  getRoom: () => GameRoom | null;
  getSocketOpenState: () => boolean;
  getMessages: () => GameRoomMessage[];
  getChatLoading: () => boolean;
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
  subscribe: (roomId: string, handlers: GameRoomSocketHandlers) => GameRoomSocketSubscription;
  handleRoomSocketState: (room: GameRoom) => void;
  handleRoomSocketMessage: (message: GameRoomMessage) => void;
  setRoomSocketOpenState: (socketOpen: boolean) => void;
  getLobbyMode: () => GamesLobbyMode;
  getRoomsAutoRefreshEnabled: () => boolean;
  getRoomsLoading: () => boolean;
  loadWaitingRoomsSilently: () => void;
  refreshCurrentRoomSilently: () => void;
  formatScore: (value: number) => string;
  onFinalResultsExpired: () => void;
  onQuestionDeadlineExpired: () => void;
};

/**
 * Создаёт runtime-обвязки страницы игр: таймеры, чат, socket и polling.
 */
export function createGamesPageRuntimes(
  options: CreateGamesPageRuntimesOptions,
): GamesPageRuntimes {
  const countdown = createGamesCountdownRuntime({
    getRoot: options.getRoot,
    formatScore: options.formatScore,
    onFinalResultsExpired: options.onFinalResultsExpired,
    onQuestionDeadlineExpired: options.onQuestionDeadlineExpired,
    onRoundResultExpired: options.onFinalResultsExpired,
  });

  const roomChat = createGamesRoomChatRuntime({
    getRoom: options.getRoom,
    getSocketOpen: options.getSocketOpenState,
    getMessages: options.getMessages,
    getLoading: options.getChatLoading,
    fetchMessages: options.fetchMessages,
    getStoredSystemMessages: options.getStoredSystemMessages,
    mergeMessages: options.mergeMessages,
    hydrateAuthorAvatars: options.hydrateAuthorAvatars,
    prepareAvatarLinks: options.prepareAvatarLinks,
    canRecoverAccess: options.canRecoverAccess,
    recoverAccess: options.recoverAccess,
    clearAccessRecovery: options.clearAccessRecovery,
    setRecoveredRoom: options.setRecoveredRoom,
    setChatState: options.setChatState,
    handleUnavailable: options.handleUnavailable,
    formatError: options.formatError,
  });

  const roomSocket = createGamesRoomSocketRuntime({
    subscribe: options.subscribe,
    handlers: {
      onRoom: options.handleRoomSocketState,
      onRoomMessage: options.handleRoomSocketMessage,
      onUnavailable: options.handleUnavailable,
      onOpen: () => options.setRoomSocketOpenState(true),
      onClose: () => options.setRoomSocketOpenState(false),
      onError: () => options.setRoomSocketOpenState(false),
    },
  });

  const roomsAutoRefresh = createGamesPollingRuntime({
    intervalMs: 3000,
    shouldRun: () =>
      Boolean(
        options.getRoot() &&
        !options.getRoom() &&
        options.getLobbyMode() === "rooms" &&
        options.getRoomsAutoRefreshEnabled(),
      ),
    onTick: () => {
      if (options.getRoomsLoading()) return;
      options.loadWaitingRoomsSilently();
    },
  });

  const roomStateRefresh = createGamesPollingRuntime({
    intervalMs: 2500,
    shouldRun: () => Boolean(options.getRoot() && options.getRoom()?.status === "waiting"),
    onTick: options.refreshCurrentRoomSilently,
  });

  return {
    countdown,
    roomChat,
    roomSocket,
    roomsAutoRefresh,
    roomStateRefresh,
  };
}
