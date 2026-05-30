import type { GamesStatePatch } from "./types";
import { gameT } from "../../shared/i18n";

/**
 * Возвращает общий loading-patch для действий с комнатой.
 */
export function getRoomActionLoadingPatch(message: string): GamesStatePatch {
  return {
    loading: true,
    message,
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает общий loading-patch без route-return полей.
 */
export function getInlineRoomLoadingPatch(message = ""): GamesStatePatch {
  return {
    loading: true,
    message,
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает state-patch начала создания комнаты.
 */
export function getCreateRoomLoadingPatch(): GamesStatePatch {
  return getRoomActionLoadingPatch(gameT("room.creating"));
}

/**
 * Возвращает state-patch начала входа в комнату по invite-коду.
 */
export function getJoinRoomLoadingPatch(inviteCode: string, password: string): GamesStatePatch {
  return {
    ...getRoomActionLoadingPatch(gameT("room.joining")),
    joinInviteCodeValue: inviteCode,
    joinPasswordValue: password,
    joinInviteCodeError: "",
    joinPasswordError: "",
  };
}

/**
 * Возвращает state-patch начала возврата в комнату.
 */
export function getReturnRoomLoadingPatch(
  roomId: string,
  inviteCode = "",
  password = "",
): GamesStatePatch {
  return {
    ...getRoomActionLoadingPatch(gameT("room.returning")),
    messageReturnRoomId: roomId,
    messageReturnInviteCode: inviteCode,
    messageReturnPassword: password,
  };
}
