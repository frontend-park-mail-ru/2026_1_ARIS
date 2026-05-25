import type { GameRoom } from "../../../api/games";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import type { GamesPageState } from "../state/store";
import { disbandCurrentRoom, exitRoomToMenu } from "./room-lifecycle";
import { backToRooms, returnToRoom } from "./room-navigation";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RoomLifecycleActionsOptions = {
  getRoom: () => GameRoom | null;
  getCurrentProfileId: () => string;
  getReturnInviteCode: () => string;
  getReturnPassword: () => string;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
  setPendingVoluntaryLeave: (pending: PendingVoluntaryLeave | null) => void;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  forgetRoomAccess: (roomId: string) => void;
  closeRoomSocket: () => void;
  stopRoomChat: () => void;
  resetGamesState: () => void;
  navigateToGamesMenu: () => void;
  navigateToRoom: (roomId: string) => void;
  navigateToRoomsRoute: () => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  refreshGamesDom: () => void;
  loadWaitingRooms: (options: { preserveMessage: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
};

/**
 * Создаёт фасад lifecycle-действий комнаты и переходов между лобби.
 */
export function createRoomLifecycleActions(options: RoomLifecycleActionsOptions) {
  /**
   * Распускает текущую комнату ожидания.
   */
  async function handleDisbandRoom(): Promise<void> {
    await disbandCurrentRoom({
      room: options.getRoom(),
      currentProfileId: options.getCurrentProfileId(),
      clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
      forgetRoomAccess: options.forgetRoomAccess,
      closeRoomSocket: options.closeRoomSocket,
      navigateAfterDisband: options.navigateToRoomsRoute,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Выводит пользователя из текущей комнаты в каталог игр.
   */
  async function handleExitGameToMenu(): Promise<void> {
    await exitRoomToMenu({
      room: options.getRoom(),
      currentProfileId: options.getCurrentProfileId(),
      forgetRoomAccess: options.forgetRoomAccess,
      closeRoomSocket: options.closeRoomSocket,
      stopRoomChat: options.stopRoomChat,
      resetGamesState: options.resetGamesState,
      navigateToGamesMenu: options.navigateToGamesMenu,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Возвращает пользователя из комнаты к списку комнат.
   */
  async function handleBackToRooms(): Promise<void> {
    const room = options.getRoom();
    await backToRooms({
      room,
      isCurrentRoomCreator: room ? options.isCurrentRoomCreator(room) : false,
      setPendingVoluntaryLeave: options.setPendingVoluntaryLeave,
      clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
      closeRoomSocket: options.closeRoomSocket,
      navigateToRoomsRoute: options.navigateToRoomsRoute,
      patchGamesState: options.patchGamesState,
      refreshGamesDom: options.refreshGamesDom,
      loadWaitingRooms: options.loadWaitingRooms,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Возвращает пользователя в комнату из inline-сообщения.
   */
  async function handleReturnToRoom(roomId: string): Promise<void> {
    await returnToRoom({
      roomId,
      inviteCode: options.getReturnInviteCode().trim(),
      password: options.getReturnPassword().trim(),
      clearPendingVoluntaryLeave: options.clearPendingVoluntaryLeave,
      navigateToRoom: options.navigateToRoom,
      setGamesState: options.setGamesState,
    });
  }

  return {
    handleDisbandRoom,
    handleExitGameToMenu,
    handleBackToRooms,
    handleReturnToRoom,
  };
}
