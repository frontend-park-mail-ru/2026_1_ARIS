import { ApiError } from "../../../../api/core/client";
import { normalizeLobbyRoomUpdate } from "../../room/state/lobby-updates";
import { getRoomLiveSignature } from "../../room/state/live-signature";
import { getRoomUpdatePatch } from "../../state/room-update-patches";
import type { RefreshCurrentRoomActionDeps, RefreshCurrentRoomSilentlyDeps } from "./types";

/**
 * Тихо обновляет текущую комнату при polling ожидания.
 */
export async function refreshCurrentRoomSilentlyAction(
  deps: RefreshCurrentRoomSilentlyDeps,
): Promise<void> {
  const currentRoom = deps.getCurrentRoom();
  if (!currentRoom || deps.getLoading()) return;
  try {
    const room = await deps.hydrateRoom(await deps.fetchRoom(currentRoom.id));
    const latestRoom = deps.getCurrentRoom();
    if (latestRoom?.id !== currentRoom.id) return;
    const normalizedRoom = normalizeLobbyRoomUpdate(latestRoom, room);
    if (getRoomLiveSignature(latestRoom) === getRoomLiveSignature(normalizedRoom)) return;
    const systemMessages = deps.getSystemMessages(latestRoom, normalizedRoom);
    deps.rememberRoomAccess(normalizedRoom);
    deps.clearRoomAccessRecovery(normalizedRoom.id);
    deps.setGamesState(
      getRoomUpdatePatch({
        room: normalizedRoom,
        currentMessages: deps.getCurrentMessages(),
        systemMessages,
        mergeMessages: deps.mergeMessages,
        patch: {
          roomId: normalizedRoom.id,
          error: "",
        },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      const recoveredRoom =
        deps.canRecoverRoomAccess(currentRoom.id) && !deps.getSocketOpen()
          ? await deps.recoverRoomAccess(currentRoom.id)
          : null;
      if (recoveredRoom && deps.getCurrentRoom()?.id === currentRoom.id) {
        deps.clearRoomAccessRecovery(currentRoom.id);
        deps.setGamesState({ room: recoveredRoom, roomId: recoveredRoom.id, error: "" });
        return;
      }
      await deps.handleRoomUnavailable({ recover: false });
      return;
    }
    if (error instanceof ApiError && error.status === 404) {
      await deps.handleRoomUnavailable({ recover: false });
    }
  }
}

/**
 * Обновляет текущую комнату с явным DOM-refresh через setGamesState.
 */
export async function refreshCurrentRoomAction(deps: RefreshCurrentRoomActionDeps): Promise<void> {
  const previousRoom = deps.getCurrentRoom();
  if (!previousRoom) return;

  const room = await deps.hydrateRoom(await deps.fetchRoom(previousRoom.id));
  const normalizedRoom = normalizeLobbyRoomUpdate(previousRoom, room);
  const systemMessages = deps.getSystemMessages(previousRoom, normalizedRoom);
  deps.rememberRoomAccess(room);
  deps.setGamesState(
    getRoomUpdatePatch({
      room: normalizedRoom,
      currentMessages: deps.getCurrentMessages(),
      systemMessages,
      mergeMessages: deps.mergeMessages,
      patch: {
        loading: false,
        message: "",
        error: "",
        errorTarget: "",
      },
    }),
  );
}
