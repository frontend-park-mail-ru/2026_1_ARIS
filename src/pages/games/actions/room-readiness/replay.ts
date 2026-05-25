import { setGameRoomReplay } from "../../../../api/games";
import { getOptimisticReadyRoom } from "../../room/state/action-model";
import type { RoomReadinessActionOptions } from "./types";

/**
 * Обновляет готовность текущего игрока к повторной игре.
 */
export async function toggleRoomReplay(
  isReady: boolean,
  options: RoomReadinessActionOptions,
): Promise<void> {
  const { room, setGamesState } = options;
  if (!room || room.status !== "finished") return;

  const optimisticRoom = getOptimisticReadyRoom(room, options.currentProfileId, isReady);
  setGamesState({ room: optimisticRoom, message: "", error: "", errorTarget: "" });

  try {
    const nextRoom = await options.hydrateRoom(await setGameRoomReplay(room.id, isReady));
    if (options.getCurrentRoom()?.id !== room.id) return;
    options.rememberRoomAccess(nextRoom);
    setGamesState({
      room: nextRoom,
      message: "",
      error: "",
      errorTarget: "",
    });
  } catch (error) {
    setGamesState({ room });
    throw error;
  }
}
