import type { GameRoom } from "../../../api/games";

export type GameRoomDisplayService = ReturnType<typeof createGameRoomDisplayService>;

/**
 * Создаёт сервис отображаемых значений комнаты.
 */
export function createGameRoomDisplayService() {
  const roomTitleCache = new Map<string, string>();

  /**
   * Запоминает последнее непустое название комнаты.
   */
  function rememberRoomTitle(roomId: string, title: string): void {
    const normalizedRoomId = roomId.trim();
    const normalizedTitle = title.trim();
    if (!normalizedRoomId || !normalizedTitle) return;
    roomTitleCache.set(normalizedRoomId, normalizedTitle);
  }

  /**
   * Возвращает отображаемое название комнаты с fallback на локальный кэш.
   */
  function getRoomTitleValue(room: GameRoom | null): string {
    if (!room) return "";
    const directTitle = room.title.trim();
    if (directTitle) {
      rememberRoomTitle(room.id, directTitle);
      return directTitle;
    }
    return roomTitleCache.get(room.id) ?? "";
  }

  /**
   * Возвращает отображаемое значение пароля комнаты.
   */
  function getRoomPasswordDisplayValue(room: GameRoom, passwordVisible: boolean): string {
    if (!room.hasPassword) {
      return "Без пароля";
    }

    if (passwordVisible) {
      return room.password.trim() || "Пароль не получен";
    }

    const length = Math.max(room.password.trim().length, 8);
    return "*".repeat(length);
  }

  return {
    getRoomPasswordDisplayValue,
    getRoomTitleValue,
    rememberRoomTitle,
  };
}
