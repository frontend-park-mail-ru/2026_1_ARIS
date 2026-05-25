import { setGameRoomReady } from "../../../../api/games";
import { getOptimisticReadyRoom } from "../../room/state/action-model";
import type { RoomReadinessActionOptions } from "./types";
import { refreshAndCommitRoomUpdate } from "./commit";

/**
 * Обновляет готовность текущего игрока с optimistic room-state.
 */
export async function toggleRoomReady(
  isReady: boolean,
  options: RoomReadinessActionOptions,
): Promise<void> {
  const { room, setGamesState } = options;
  if (!room) return;

  const nextRoom = getOptimisticReadyRoom(room, options.currentProfileId, isReady);
  setGamesState({ room: nextRoom, message: "", error: "", errorTarget: "" });

  try {
    await setGameRoomReady(room.id, isReady);
    await refreshAndCommitRoomUpdate(room, options, {
      message: "",
      error: "",
      errorTarget: "",
    });
  } catch (error) {
    setGamesState({ room });
    throw error;
  }
}
