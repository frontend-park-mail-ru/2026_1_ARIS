/**
 * Factory опций runtime страницы игр.
 *
 * Собирает API и page-level callbacks для chat/socket/polling runtime, чтобы
 * entrypoint не знал детали транспорта и фоновых обновлений.
 */
import {
  getGameRoomMessages,
  subscribeToGameRoom,
  type GameRoom,
  type GameRoomMessage,
} from "../../../api/games";
import { prepareAvatarLinks } from "../../../utils/avatar";
import { getStoredRoomSystemMessages } from "../chat/model";
import { getErrorMessage } from "../shared/errors";
import { formatRoundPointValue } from "../shared/formatters";
import type { GamesPageState } from "../state/store";
import type { RoomChatStatePatch } from "./dom-updaters";
import type { CreateGamesPageRuntimesOptions, GamesPageRuntimes } from "./page-runtimes";
import type { GamesPageRuntimeRefs } from "./page-runtime-refs";
import type { RoomChatStateOptions } from "./room-chat";

export type GamesPageRuntimesOptionsFactoryParams = {
  getRoot: () => Document | HTMLElement | null;
  getState: () => Readonly<GamesPageState>;
  mergeRoomChatMessages: (
    existing: GameRoomMessage[],
    incoming: GameRoomMessage[],
  ) => GameRoomMessage[];
  hydrateRoomChatAuthorAvatars: (
    room: GameRoom | null,
    messages: GameRoomMessage[],
  ) => Promise<string[]>;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string) => Promise<GameRoom | null>;
  clearRoomAccessRecovery: (roomId: string) => void;
  setRecoveredRoom: (room: GameRoom) => void;
  setRoomChatState: (patch: RoomChatStatePatch, options?: RoomChatStateOptions) => void;
  setRoomSocketOpenState: (socketOpen: boolean) => void;
  refreshGamesDom: () => void;
  runtimeRefs: GamesPageRuntimeRefs;
};

/**
 * Создаёт опции runtime страницы игр.
 */
export function createGamesPageRuntimesOptions(
  params: GamesPageRuntimesOptionsFactoryParams,
): CreateGamesPageRuntimesOptions {
  const getRoom = () => params.getState().room;

  return {
    getRoot: params.getRoot,
    getRoom,
    getSocketOpenState: () => params.getState().socketOpen,
    getMessages: () => params.getState().roomChatMessages,
    getChatLoading: () => params.getState().roomChatLoading,
    fetchMessages: getGameRoomMessages,
    getStoredSystemMessages: getStoredRoomSystemMessages,
    mergeMessages: params.mergeRoomChatMessages,
    hydrateAuthorAvatars: params.hydrateRoomChatAuthorAvatars,
    prepareAvatarLinks,
    canRecoverAccess: params.canRecoverRoomAccess,
    recoverAccess: params.recoverRoomAccess,
    clearAccessRecovery: params.clearRoomAccessRecovery,
    setRecoveredRoom: params.setRecoveredRoom,
    setChatState: params.setRoomChatState,
    handleUnavailable: params.runtimeRefs.handleUnavailableWithoutRecovery,
    formatError: getErrorMessage,
    subscribe: subscribeToGameRoom,
    handleRoomSocketState: params.runtimeRefs.handleRoomSocketStateRef,
    handleRoomSocketMessage: params.runtimeRefs.handleRoomSocketMessageRef,
    setRoomSocketOpenState: params.setRoomSocketOpenState,
    getLobbyMode: () => params.getState().lobbyMode,
    getRoomsAutoRefreshEnabled: () => params.getState().roomsAutoRefreshEnabled,
    getRoomsLoading: () => params.getState().roomsLoading,
    loadWaitingRoomsSilently: params.runtimeRefs.loadWaitingRoomsSilently,
    refreshCurrentRoomSilently: params.runtimeRefs.refreshCurrentRoomSilentlyRef,
    formatScore: formatRoundPointValue,
    onFinalResultsExpired: params.refreshGamesDom,
  };
}

export type GamesPageRuntimesFactory = (
  options: CreateGamesPageRuntimesOptions,
) => GamesPageRuntimes;
