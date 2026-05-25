import { updateGameRoomRanked } from "../../../../api/games";
import { getRoomUpdatePatch } from "../../state/room-update-patches";
import { getOptimisticRankedRoom } from "../../room/state/action-model";
import { resetRoomReadyState } from "../../room/state/lobby-updates";
import { isCurrentRoomCreator } from "../../room/selectors";
import { fetchNormalizedRoomUpdate } from "./commit";
import type { ToggleRoomRankedOptions } from "./types";

/**
 * Обновляет ranked-режим комнаты с optimistic state и сбросом готовности.
 */
export async function toggleRoomRanked(
  isRanked: boolean,
  options: ToggleRoomRankedOptions,
): Promise<void> {
  const { room, setGamesState } = options;
  if (!room || room.status !== "waiting") return;
  if (!isCurrentRoomCreator(room, options.currentProfileId)) {
    setGamesState({
      message: "",
      error: "Тип игры может менять только администратор.",
      errorTarget: "footer",
    });
    return;
  }
  if (room.isRanked === isRanked) return;

  const nextRoom = getOptimisticRankedRoom(room, isRanked);
  options.setPendingRankedToast({ roomId: room.id, isRanked });
  setGamesState({
    room: nextRoom,
    loading: true,
    message: "",
    error: "",
    errorTarget: "",
  });
  options.showToast(options.getRankedToastMessage(isRanked));

  try {
    await updateGameRoomRanked(room.id, isRanked);
    const refreshedRoom = await fetchNormalizedRoomUpdate(room, options);
    if (!refreshedRoom) return;

    const confirmedRoom = resetRoomReadyState({ ...refreshedRoom, isRanked });
    const systemMessages = options.getSystemMessages(room, confirmedRoom);
    setGamesState(
      getRoomUpdatePatch({
        room: confirmedRoom,
        currentMessages: options.currentMessages,
        systemMessages,
        mergeMessages: options.mergeMessages,
        patch: { loading: false },
      }),
    );
  } catch (error) {
    options.setPendingRankedToast(null);
    setGamesState({ room, loading: false });
    throw error;
  }
}
