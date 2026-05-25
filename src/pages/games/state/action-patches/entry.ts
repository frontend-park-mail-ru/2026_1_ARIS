import type { GameRoom } from "../../../../api/games";
import type { GamesStatePatch } from "./types";

/**
 * Возвращает state-patch ошибки повторного создания комнаты.
 */
export function getExistingCreatedRoomPatch(room: GameRoom): GamesStatePatch {
  return {
    loading: false,
    message: "Вы не можете создать больше одной комнаты.",
    messageReturnRoomId: room.id,
    messageReturnInviteCode: room.inviteCode || "",
    messageReturnPassword: room.password || "",
    messageReturnRoomLabel: "Войти в вашу комнату?",
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
    message: "В этой комнате уже максимальное число участников.",
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
export function getRoomNotFoundPatch(message = "Этой комнаты не существует."): GamesStatePatch {
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
