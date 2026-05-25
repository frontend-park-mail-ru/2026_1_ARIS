import { ApiError } from "../../../api/core/client";
import type { GameRoom } from "../../../api/games";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import { getRoomUnavailablePatch } from "../state/action-patches";
import type { GamesPageState } from "../state/store";

export type HandleRoomUnavailableActionOptions = {
  recover?: boolean;
};

export type HandleRoomUnavailableActionDeps = {
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
 * Обрабатывает потерю доступа к комнате и переводит страницу в стабильное состояние.
 */
export async function handleRoomUnavailableAction(
  options: HandleRoomUnavailableActionOptions | undefined,
  deps: HandleRoomUnavailableActionDeps,
): Promise<void> {
  const shouldRecover = options?.recover ?? true;
  const roomId = deps.getRoom()?.id || deps.getRoomId();
  let message = "Комната распущена.";
  let messageReturnRoomId = "";
  let messageReturnInviteCode = "";
  let messageReturnPassword = "";
  let messageReturnRoomLabel = "";
  let lobbyMode: GamesPageState["lobbyMode"] = "menu";
  const voluntaryLeaveState =
    roomId && deps.getPendingVoluntaryLeave()?.roomId === roomId
      ? deps.getPendingVoluntaryLeave()
      : null;
  const leftVoluntarily = Boolean(voluntaryLeaveState);

  if (roomId && !shouldRecover) {
    deps.clearRoomAccessRecovery(roomId);
  }

  if (voluntaryLeaveState && roomId) {
    message = voluntaryLeaveState.message;
    messageReturnRoomId = roomId;
    messageReturnInviteCode = voluntaryLeaveState.inviteCode;
    messageReturnPassword = voluntaryLeaveState.password;
    messageReturnRoomLabel = voluntaryLeaveState.returnLabel;
    lobbyMode = voluntaryLeaveState.nextLobbyMode;
    deps.clearPendingVoluntaryLeave(roomId);
  }

  if (roomId) {
    const roomRestored = await restoreUnavailableRoom(roomId, shouldRecover, leftVoluntarily, deps);
    if (roomRestored === "restored" || roomRestored === "recovering") {
      return;
    }
    if (roomRestored === "removed") {
      message = "Вы были удалены из комнаты.";
    }
  }

  if (roomId) {
    deps.forgetRoomAccess(roomId);
  }

  deps.patchGamesState(
    getRoomUnavailablePatch({
      lobbyMode,
      message,
      messageReturnRoomId,
      messageReturnInviteCode,
      messageReturnPassword,
      messageReturnRoomLabel,
    }),
  );
  deps.closeRoomSocket();
  deps.navigateToRooms();
  deps.refreshGamesDom();
}

/**
 * Пытается вернуть комнату перед окончательным выходом в лобби.
 */
async function restoreUnavailableRoom(
  roomId: string,
  shouldRecover: boolean,
  leftVoluntarily: boolean,
  deps: HandleRoomUnavailableActionDeps,
): Promise<"restored" | "recovering" | "removed" | "unavailable"> {
  try {
    const room = await deps.hydrateRoom(await deps.fetchRoom(roomId));
    if (isSameRoomStillOpen(roomId, deps)) {
      deps.rememberRoomAccess(room);
      deps.clearRoomAccessRecovery(roomId);
      deps.setGamesState({ room, roomId: room.id, socketOpen: deps.isSocketOpen() });
    }
    deps.clearPendingVoluntaryLeave(roomId);
    return "restored";
  } catch (error) {
    if (!leftVoluntarily && error instanceof ApiError && error.status === 403) {
      const recoveredRoom =
        shouldRecover && deps.canRecoverRoomAccess(roomId)
          ? await deps.recoverRoomAccess(roomId)
          : null;
      if (recoveredRoom && isSameRoomStillOpen(roomId, deps)) {
        deps.clearRoomAccessRecovery(roomId);
        deps.setGamesState({
          room: recoveredRoom,
          roomId: recoveredRoom.id,
          socketOpen: deps.isSocketOpen(),
          error: "",
        });
        deps.clearPendingVoluntaryLeave(roomId);
        return "restored";
      }
      if (shouldRecover && deps.canRecoverRoomAccess(roomId)) {
        deps.setGamesState({ loading: false, error: "" });
        return "recovering";
      }
      return "removed";
    }
  }

  return "unavailable";
}

/**
 * Проверяет, что пользователь всё ещё находится в той же комнате после async-операции.
 */
function isSameRoomStillOpen(roomId: string, deps: HandleRoomUnavailableActionDeps): boolean {
  return deps.getRoomId() === roomId || deps.getRoom()?.id === roomId;
}
