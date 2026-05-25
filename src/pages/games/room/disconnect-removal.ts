import type { GameRoomMessage } from "../../../api/games";

export type RoomDisconnectRemovalTracker = ReturnType<typeof createRoomDisconnectRemovalTracker>;

/**
 * Создаёт трекер временного подавления disconnect-сообщений после удаления игрока.
 */
export function createRoomDisconnectRemovalTracker(timeoutMs = 15000) {
  const pendingRemovalKeys = new Set<string>();

  /**
   * Возвращает ключ удаления игрока из комнаты.
   */
  function getRoomDisconnectRemovalKey(roomId: string, profileId: string): string {
    return `${roomId}:${profileId}`;
  }

  /**
   * Запоминает системное сообщение удаления игрока.
   */
  function rememberRoomDisconnectRemovalMessage(message: GameRoomMessage): void {
    const match = /^system:disconnect:([^:]+):([^:]+):/.exec(message.id);
    if (!match?.[1] || !match[2]) return;

    const key = getRoomDisconnectRemovalKey(match[1], match[2]);
    pendingRemovalKeys.add(key);
    window.setTimeout(() => {
      pendingRemovalKeys.delete(key);
    }, timeoutMs);
  }

  /**
   * Проверяет и поглощает pending-removal для игрока.
   */
  function consumeRoomDisconnectRemoval(roomId: string, profileId: string): boolean {
    const key = getRoomDisconnectRemovalKey(roomId, profileId);
    const hasRemoval = pendingRemovalKeys.has(key);
    if (hasRemoval) {
      pendingRemovalKeys.delete(key);
    }
    return hasRemoval;
  }

  return {
    consumeRoomDisconnectRemoval,
    getRoomDisconnectRemovalKey,
    rememberRoomDisconnectRemovalMessage,
  };
}
