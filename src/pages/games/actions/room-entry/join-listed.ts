import { ApiError } from "../../../../api/core/client";
import { joinGameRoom } from "../../../../api/games";
import { getRoomNotFoundPatch } from "../../state/action-patches";
import { isJoinRoomAlreadyStartedError, isJoinRoomFullError } from "../../shared/errors";
import type { JoinListedRoomActionOptions } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Подключает пользователя к комнате из списка комнат.
 */
export async function joinListedRoomAction(options: JoinListedRoomActionOptions): Promise<void> {
  const { listedRoom, password, inviteCode } = options;
  if (listedRoom && options.shouldBlockFullRoomJoin(listedRoom)) {
    options.showRoomFullMessage();
    return;
  }

  options.setGamesOverlayState({
    loading: true,
    joinPasswordValue: password,
    joinPasswordError: "",
    error: "",
    errorTarget: "",
  });

  try {
    const room = await joinGameRoom(options.payload);
    options.setGamesState({
      joinPasswordRoomId: "",
      joinPasswordValue: "",
      joinPasswordVisible: false,
      joinPasswordError: "",
      error: "",
      errorTarget: "",
    });
    options.rememberRoomAccess(room, { password, inviteCode });
    options.navigateToRoom(room.id);
  } catch (error) {
    if (isJoinRoomFullError(error)) {
      options.showRoomFullMessage();
      await options.loadWaitingRooms({ preserveMessage: true, silent: true });
      return;
    }
    if (isJoinRoomAlreadyStartedError(error)) {
      options.navigateToGamesMenu();
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      options.setGamesOverlayState({
        loading: false,
        joinPasswordValue: password,
        joinPasswordError: gameT("join.wrongPassword"),
        error: "",
        errorTarget: "",
      });
      return;
    }
    if (error instanceof ApiError && error.status === 404) {
      options.setGamesState(getRoomNotFoundPatch());
      await options.loadWaitingRooms({ preserveMessage: true, silent: true });
      return;
    }
    throw error;
  }
}
