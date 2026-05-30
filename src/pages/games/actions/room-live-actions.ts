import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { handleRoomSocketMessage as handleRoomSocketMessageBase } from "../runtime/room-socket-message";
import type { GamesPageState } from "../state/store";
import {
  applyRoomSocketState,
  refreshCurrentRoomSilentlyAction,
  type PendingRankedToast,
} from "./room-live";

type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

type RoomChatStateOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

export type RoomLiveActionsOptions = {
  getRoom: () => GameRoom | null;
  getLoading: () => boolean;
  getSocketOpenState: () => boolean;
  getSocketOpenRuntime: () => boolean;
  getCurrentProfileId: () => string;
  getSubmittedQuestionId: () => string;
  getSubmittedAnswerValue: () => string;
  getCurrentMessages: () => GameRoomMessage[];
  fetchRoom: (roomId: string) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSystemMessages: (previousRoom: GameRoom | null, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  clearRoomAccessRecovery: (roomId?: string) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string) => Promise<GameRoom | null>;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  refreshGamesDom: () => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room: GameRoom | null) => void;
  getPendingRankedToast: () => PendingRankedToast | null;
  setPendingRankedToast: (toast: PendingRankedToast | null) => void;
  showToast: (message: string) => void;
  getRankedToastMessage: (isRanked: boolean) => string;
  rememberDisconnectRemoval: (message: GameRoomMessage) => void;
  getAuthorAvatar: (room: GameRoom | null, message: GameRoomMessage) => string;
  hydrateAuthorAvatars: (room: GameRoom | null, messages: GameRoomMessage[]) => Promise<string[]>;
  prepareAvatarLinks: (avatarLinks: string[]) => void | Promise<void>;
  refreshChat: (options: RoomChatStateOptions) => void;
  setChatState: (patch: RoomChatStatePatch, options?: RoomChatStateOptions) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  handleRoomUnavailable: (options?: { recover?: boolean }) => Promise<void>;
};

/**
 * Создаёт фасад live-действий комнаты для socket и polling обновлений.
 */
export function createRoomLiveActions(options: RoomLiveActionsOptions) {
  let socketStateQueue = Promise.resolve();

  /**
   * Применяет snapshot комнаты, пришедший по WebSocket.
   */
  async function handleRoomSocketState(room: GameRoom): Promise<void> {
    socketStateQueue = socketStateQueue
      .catch(() => undefined)
      .then(() =>
        applyRoomSocketState(room, {
          getCurrentRoom: options.getRoom,
          getCurrentProfileId: options.getCurrentProfileId,
          getSubmittedQuestionId: options.getSubmittedQuestionId,
          getSubmittedAnswerValue: options.getSubmittedAnswerValue,
          getCurrentMessages: options.getCurrentMessages,
          hydrateRoom: options.hydrateRoom,
          getSocketOpen: options.getSocketOpenRuntime,
          getSystemMessages: options.getSystemMessages,
          mergeMessages: options.mergeMessages,
          rememberRoomAccess: options.rememberRoomAccess,
          clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
          patchGamesState: options.patchGamesState,
          refreshGamesDom: options.refreshGamesDom,
          syncCurrentAnswerFormDom: options.syncCurrentAnswerFormDom,
          syncPlayersRailAnswerDom: options.syncPlayersRailAnswerDom,
          getPendingRankedToast: options.getPendingRankedToast,
          setPendingRankedToast: options.setPendingRankedToast,
          showToast: options.showToast,
          getRankedToastMessage: options.getRankedToastMessage,
        }),
      );
    await socketStateQueue;
  }

  /**
   * Обрабатывает входящее socket-сообщение чата комнаты.
   */
  function handleRoomSocketMessage(message: GameRoomMessage): void {
    handleRoomSocketMessageBase(message, {
      getRoom: options.getRoom,
      getMessages: options.getCurrentMessages,
      rememberDisconnectRemoval: options.rememberDisconnectRemoval,
      getAuthorAvatar: options.getAuthorAvatar,
      hydrateAuthorAvatars: options.hydrateAuthorAvatars,
      prepareAvatarLinks: options.prepareAvatarLinks,
      refreshChat: options.refreshChat,
      mergeMessages: options.mergeMessages,
      setChatState: (patch, stateOptions) => {
        options.setChatState(patch, stateOptions);
      },
    });
  }

  /**
   * Тихо обновляет комнату при polling без ручного действия пользователя.
   */
  async function refreshCurrentRoomSilently(): Promise<void> {
    await refreshCurrentRoomSilentlyAction({
      getCurrentRoom: options.getRoom,
      getLoading: options.getLoading,
      getSocketOpen: options.getSocketOpenState,
      getCurrentMessages: options.getCurrentMessages,
      fetchRoom: options.fetchRoom,
      hydrateRoom: options.hydrateRoom,
      getSystemMessages: options.getSystemMessages,
      mergeMessages: options.mergeMessages,
      rememberRoomAccess: options.rememberRoomAccess,
      clearRoomAccessRecovery: options.clearRoomAccessRecovery,
      canRecoverRoomAccess: options.canRecoverRoomAccess,
      recoverRoomAccess: options.recoverRoomAccess,
      setGamesState: options.setGamesState,
      handleRoomUnavailable: options.handleRoomUnavailable,
    });
  }

  return {
    handleRoomSocketState,
    handleRoomSocketMessage,
    refreshCurrentRoomSilently,
  };
}
