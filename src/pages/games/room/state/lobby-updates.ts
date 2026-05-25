import type { GameRoom } from "../../../../api/games";

/** Сбрасывает готовность игроков в комнате ожидания. */
export function resetRoomReadyState(room: GameRoom): GameRoom {
  if (room.status !== "waiting") return room;
  return {
    ...room,
    players: room.players.map((player) => ({ ...player, isReady: false })),
  };
}

/** Возвращает стабильную сигнатуру состава игроков комнаты. */
function getRoomRosterSignature(room: GameRoom | null): string {
  return (room?.players ?? [])
    .map((player) => player.profileId)
    .sort()
    .join("|");
}

/** Проверяет, нужно ли сбросить готовность при обновлении lobby-комнаты. */
export function shouldResetReadyOnLobbyRoomUpdate(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
): boolean {
  if (!previousRoom || previousRoom.id !== nextRoom.id) return false;
  if (previousRoom.status !== "waiting" || nextRoom.status !== "waiting") return false;
  return (
    previousRoom.isRanked !== nextRoom.isRanked ||
    getRoomRosterSignature(previousRoom) !== getRoomRosterSignature(nextRoom)
  );
}

/** Нормализует обновление комнаты ожидания перед записью в состояние страницы. */
export function normalizeLobbyRoomUpdate(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
): GameRoom {
  return shouldResetReadyOnLobbyRoomUpdate(previousRoom, nextRoom)
    ? resetRoomReadyState(nextRoom)
    : nextRoom;
}
