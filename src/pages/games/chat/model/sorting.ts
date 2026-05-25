import type { GameRoomMessage } from "../../../../api/games";

/**
 * Возвращает timestamp сообщения для сортировки.
 */
export function getRoomChatMessageTime(message: GameRoomMessage): number {
  const timestamp = message.createdAt ? new Date(message.createdAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Сортирует сообщения по времени и стабильному id.
 */
export function sortRoomChatMessages(messages: GameRoomMessage[]): GameRoomMessage[] {
  return [...messages].sort((left, right) => {
    const timeDelta = getRoomChatMessageTime(left) - getRoomChatMessageTime(right);
    if (timeDelta !== 0) return timeDelta;
    return left.id.localeCompare(right.id, "ru", { numeric: true });
  });
}
