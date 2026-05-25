import type { PendingVoluntaryLeave } from "../../room/lifecycle";
import type { GamesStatePatch, RoomUnavailablePatchOptions } from "./types";

/**
 * Возвращает state-patch успешного роспуска комнаты.
 */
export function getDisbandRoomSuccessPatch(): GamesStatePatch {
  return {
    room: null,
    roomId: "",
    lobbyMode: "menu",
    loading: false,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    kickConfirmProfileId: "",
    socketOpen: false,
    message: "Комната распущена.",
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает state-patch перехода из комнаты обратно к списку комнат.
 */
export function getBackToRoomsPatch(voluntaryLeave: PendingVoluntaryLeave | null): GamesStatePatch {
  return {
    room: null,
    roomId: "",
    socketOpen: false,
    lobbyMode: "rooms",
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    loading: false,
    message: voluntaryLeave?.message ?? "",
    messageReturnRoomId: voluntaryLeave?.roomId ?? "",
    messageReturnInviteCode: voluntaryLeave?.inviteCode ?? "",
    messageReturnPassword: voluntaryLeave?.password ?? "",
    messageReturnRoomLabel: voluntaryLeave?.returnLabel ?? "",
    messageRefreshRooms: false,
    error: "",
    errorTarget: "",
  };
}

/**
 * Возвращает state-patch недоступной комнаты.
 */
export function getRoomUnavailablePatch(options: RoomUnavailablePatchOptions): GamesStatePatch {
  return {
    room: null,
    roomId: "",
    lobbyMode: options.lobbyMode,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    participantsStatusHintOpen: false,
    readyStatusHintOpen: false,
    socketOpen: false,
    message: options.message,
    messageReturnRoomId: options.messageReturnRoomId ?? "",
    messageReturnInviteCode: options.messageReturnInviteCode ?? "",
    messageReturnPassword: options.messageReturnPassword ?? "",
    messageReturnRoomLabel: options.messageReturnRoomLabel ?? "",
    messageRefreshRooms: false,
    error: "",
  };
}
