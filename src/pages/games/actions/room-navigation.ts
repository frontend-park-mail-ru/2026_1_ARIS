import { joinGameRoom, leaveGameRoom, type GameRoom } from "../../../api/games";
import {
  getBackToRoomsPatch,
  getInlineRoomLoadingPatch,
  getReturnRoomLoadingPatch,
} from "../state/action-patches";
import type { GamesPageState } from "../state/store";
import { createPendingVoluntaryLeave, type PendingVoluntaryLeave } from "../room/lifecycle";
import { gameT } from "../shared/i18n";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type BackToRoomsOptions = {
  room: GameRoom | null;
  isCurrentRoomCreator: boolean;
  setPendingVoluntaryLeave: (pending: PendingVoluntaryLeave | null) => void;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  closeRoomSocket: () => void;
  navigateToRoomsRoute: () => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  refreshGamesDom: () => void;
  loadWaitingRooms: (options: { preserveMessage: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
};

export type ReturnToRoomOptions = {
  roomId: string;
  inviteCode: string;
  password: string;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  navigateToRoom: (roomId: string) => void;
  setGamesState: SetGamesState;
};

/**
 * Возвращает пользователя из комнаты к списку комнат с сохранением pending leave.
 */
export async function backToRooms(options: BackToRoomsOptions): Promise<void> {
  const { room, setGamesState } = options;
  let pendingVoluntaryLeave: PendingVoluntaryLeave | null = null;

  if (room?.status === "waiting") {
    setGamesState(getInlineRoomLoadingPatch(gameT("room.leaving")));
    try {
      pendingVoluntaryLeave = createPendingVoluntaryLeave(
        room,
        "rooms",
        options.isCurrentRoomCreator,
      );
      options.setPendingVoluntaryLeave(pendingVoluntaryLeave);
      await leaveGameRoom(room.id);
    } catch (error) {
      options.clearPendingVoluntaryLeave(room.id);
      throw error;
    }
  }

  options.closeRoomSocket();
  options.navigateToRoomsRoute();
  options.patchGamesState(
    getBackToRoomsPatch(room?.status === "waiting" ? pendingVoluntaryLeave : null),
  );
  options.refreshGamesDom();
  await options.loadWaitingRooms({ preserveMessage: Boolean(room?.status === "waiting") });
}

/**
 * Возвращает пользователя в сохранённую комнату из inline-сообщения.
 */
export async function returnToRoom(options: ReturnToRoomOptions): Promise<void> {
  const { roomId, inviteCode, password, setGamesState } = options;
  if (!roomId) return;

  setGamesState(getReturnRoomLoadingPatch(roomId, inviteCode, password));
  options.clearPendingVoluntaryLeave(roomId);
  const room = await joinGameRoom(
    inviteCode ? { inviteCode, ...(password ? { password } : {}) } : { roomId },
  );
  setGamesState({
    loading: false,
    message: "",
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
  });
  options.navigateToRoom(room.id);
}
