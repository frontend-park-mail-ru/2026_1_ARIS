import type { GameRoom } from "../../../api/games";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import type { GamesPageState } from "../state/store";
import {
  handleRoomUnavailableAction,
  type HandleRoomUnavailableActionOptions,
} from "./room-unavailable";

export type RoomUnavailableActionsOptions = {
  getRoom: () => GameRoom | null;
  getRoomId: () => string;
  getPendingVoluntaryLeave: () => PendingVoluntaryLeave | null;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  clearRoomAccessRecovery: (roomId?: string) => void;
  fetchRoom: (roomId: string) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  rememberRoomAccess: (room: GameRoom) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string) => Promise<GameRoom | null>;
  isSocketOpen: () => boolean;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  forgetRoomAccess: (roomId?: string) => void;
  closeRoomSocket: () => void;
  navigateToRooms: () => void;
  refreshGamesDom: () => void;
};

/**
 * Создаёт фасад обработки недоступной комнаты с защитой от параллельных запусков.
 */
export function createRoomUnavailableActions(options: RoomUnavailableActionsOptions) {
  let handlingPromise: Promise<void> | null = null;

  /**
   * Обрабатывает потерю доступа к комнате не чаще одного раза параллельно.
   */
  async function handleRoomUnavailable(
    actionOptions: HandleRoomUnavailableActionOptions = {},
  ): Promise<void> {
    if (handlingPromise) return handlingPromise;
    handlingPromise = handleRoomUnavailableAction(actionOptions, options).finally(() => {
      handlingPromise = null;
    });
    return handlingPromise;
  }

  return {
    handleRoomUnavailable,
  };
}
