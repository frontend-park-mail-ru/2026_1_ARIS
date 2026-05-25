import { joinGameRoom } from "../../../../api/games";
import { getJoinRoomLoadingPatch } from "../../state/action-patches";
import {
  isJoinRoomAlreadyStartedError,
  isJoinRoomFullError,
  isJoinRoomNotFoundError,
  isJoinRoomPasswordError,
} from "../../shared/errors";
import type { JoinRoomByCodeActionOptions } from "./types";

/**
 * Подключает пользователя к комнате по invite-коду.
 */
export async function joinRoomByCodeAction(options: JoinRoomByCodeActionOptions): Promise<void> {
  const { inviteCode, password } = options;
  if (!options.payload.inviteCode) return;

  options.setGamesOverlayState(getJoinRoomLoadingPatch(inviteCode, password));
  try {
    const room = await joinGameRoom(options.payload);
    options.rememberRoomAccess(room, { password, inviteCode });
    options.navigateToRoom(room.id);
  } catch (error) {
    if (isJoinRoomAlreadyStartedError(error)) {
      options.navigateToGamesMenu();
      return;
    }
    if (isJoinRoomFullError(error)) {
      options.showRoomFullMessage();
      await options.loadWaitingRooms({ preserveMessage: true, silent: true });
      return;
    }
    if (isJoinRoomNotFoundError(error)) {
      options.setGamesState({
        loading: false,
        message: "",
        error: "",
        errorTarget: "",
        joinInviteCodeValue: inviteCode,
        joinPasswordValue: password,
        joinInviteCodeError: "Игра не найдена",
        joinPasswordError: "",
      });
      return;
    }
    if (isJoinRoomPasswordError(error)) {
      options.setGamesState({
        loading: false,
        message: "",
        error: "",
        errorTarget: "",
        joinInviteCodeValue: inviteCode,
        joinPasswordValue: password,
        joinInviteCodeError: "",
        joinPasswordError: "Пароль неверный",
      });
      return;
    }
    throw error;
  }
}
