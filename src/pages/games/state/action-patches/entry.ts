import type { GameRoom } from "../../../../api/games";
import { gameT } from "../../shared/i18n";
import type { GamesStatePatch } from "./types";

/**
 * Возвращает state-patch ошибки повторного создания комнаты.
 */
export function getExistingCreatedRoomPatch(room: GameRoom): GamesStatePatch {
  return {
    loading: false,
    message: gameT("room.oneRoomLimit"),
    messageReturnRoomId: room.id,
    messageReturnInviteCode: room.inviteCode || "",
    messageReturnPassword: room.password || "",
    messageReturnRoomLabel: gameT("page.returnRoom"),
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает state-patch сообщения о заполненной комнате.
 */
export function getRoomFullMessagePatch(): GamesStatePatch {
  return {
    loading: false,
    message: gameT("room.full"),
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageReturnRoomLabel: "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
    joinPasswordRoomId: "",
    joinPasswordValue: "",
    joinPasswordVisible: false,
    joinPasswordError: "",
  };
}

/**
 * Возвращает state-patch отсутствующей комнаты с предложением обновить список.
 */
export function getRoomNotFoundPatch(message = gameT("room.notFound")): GamesStatePatch {
  return {
    loading: false,
    message,
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: true,
    error: "",
    errorTarget: "",
  };
}
