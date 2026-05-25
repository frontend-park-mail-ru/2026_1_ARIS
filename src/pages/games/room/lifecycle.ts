import type { GameRoom } from "../../../api/games";

export type PendingVoluntaryLeave = {
  roomId: string;
  nextLobbyMode: "rooms" | "menu";
  inviteCode: string;
  password: string;
  message: string;
  returnLabel: string;
};

/** Возвращает сообщение добровольного выхода из комнаты. */
export function getVoluntaryLeaveMessage(isOwnRoom: boolean): string {
  return isOwnRoom ? "Вы вышли из своей комнаты." : "Вы вышли из комнаты.";
}

/** Возвращает подпись действия возврата после добровольного выхода. */
export function getVoluntaryLeaveReturnLabel(isOwnRoom: boolean): string {
  return isOwnRoom ? "Войти в вашу комнату?" : "Вернуться в комнату?";
}

/** Создаёт снимок добровольного выхода для последующего восстановления комнаты. */
export function createPendingVoluntaryLeave(
  room: GameRoom,
  nextLobbyMode: PendingVoluntaryLeave["nextLobbyMode"],
  isOwnRoom: boolean,
): PendingVoluntaryLeave {
  return {
    roomId: room.id,
    nextLobbyMode,
    inviteCode: room.inviteCode || "",
    password: room.password || "",
    message: getVoluntaryLeaveMessage(isOwnRoom),
    returnLabel: getVoluntaryLeaveReturnLabel(isOwnRoom),
  };
}
