import { ApiError } from "../../../../api/core/client";
import { joinGameRoom } from "../../../../api/games";
import { getReturnRoomLoadingPatch, getRoomNotFoundPatch } from "../../state/action-patches";
import type { JoinOwnListedRoomActionOptions } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Возвращает создателя в собственную комнату из списка.
 */
export async function joinOwnListedRoomAction(
  options: JoinOwnListedRoomActionOptions,
): Promise<void> {
  options.setGamesState(getReturnRoomLoadingPatch(""));

  try {
    const joinedRoom = await joinGameRoom({ roomId: options.room.id });
    options.setGamesState({ error: "", errorTarget: "" });
    options.rememberRoomAccess(joinedRoom);
    options.navigateToRoom(joinedRoom.id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      options.setGamesState(getRoomNotFoundPatch());
      await options.loadWaitingRooms({ preserveMessage: true, silent: true });
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      options.setGamesState({
        loading: false,
        message: "",
        error: gameT("room.recoverOwnError"),
        errorTarget: "form",
      });
      return;
    }
    throw error;
  }
}
