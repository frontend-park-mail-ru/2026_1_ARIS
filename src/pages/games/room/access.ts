/**
 * Хранилище доступа к игровой комнате.
 *
 * Запоминает вход в комнату на время сессии, чтобы переживать обновление страницы,
 * временные 403 после смены прав и короткие переподключения.
 */
import type { GameRoom } from "../../../api/games";

const gameRoomAccessStorageKey = "aris.games.roomAccess";
const gameRoomAccessRecoveryWindowMs = 30000;

let roomAccessRecoveryRoomId = "";
let roomAccessRecoveryAllowedUntil = 0;

export type StoredGameRoomAccess = {
  roomId: string;
  inviteCode: string;
  password: string;
  roomSnapshot?: GameRoom;
};

/**
 * Читает сохранённый доступ к конкретной комнате из sessionStorage.
 */
export function getStoredRoomAccess(roomId: string): StoredGameRoomAccess | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(gameRoomAccessStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredGameRoomAccess>;
    if (String(value.roomId ?? "") !== roomId) return null;
    const roomSnapshot =
      value.roomSnapshot && typeof value.roomSnapshot === "object"
        ? (value.roomSnapshot as GameRoom)
        : undefined;

    return {
      roomId,
      inviteCode: String(value.inviteCode ?? ""),
      password: String(value.password ?? ""),
      ...(roomSnapshot?.id === roomId ? { roomSnapshot } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Сохраняет доступ к комнате и последний снимок комнаты.
 */
export function rememberRoomAccess(
  room: GameRoom,
  options: { password?: string; inviteCode?: string } = {},
): void {
  if (typeof window === "undefined" || !room.id) return;
  const access: StoredGameRoomAccess = {
    roomId: room.id,
    inviteCode: options.inviteCode ?? room.inviteCode ?? "",
    password: options.password ?? room.password ?? "",
    roomSnapshot: room,
  };

  try {
    window.sessionStorage.setItem(gameRoomAccessStorageKey, JSON.stringify(access));
  } catch {
    // Storage может быть недоступен в приватном режиме; ссылки комнат продолжают работать без него.
  }
}

/**
 * Удаляет сохранённый доступ к комнате.
 */
export function forgetRoomAccess(roomId?: string): void {
  if (typeof window === "undefined") return;
  if (roomId) {
    const stored = getStoredRoomAccess(roomId);
    if (!stored) return;
  }
  clearRoomAccessRecovery(roomId);
  try {
    window.sessionStorage.removeItem(gameRoomAccessStorageKey);
  } catch {
    // Игнорируем ошибки storage: runtime-состояние уже очищено.
  }
}

/**
 * Возвращает сохранённый снимок комнаты.
 */
export function getStoredRoomSnapshot(roomId: string): GameRoom | null {
  return getStoredRoomAccess(roomId)?.roomSnapshot ?? null;
}

/**
 * Открывает короткое окно восстановления доступа к комнате.
 */
export function allowRoomAccessRecovery(roomId: string): void {
  roomAccessRecoveryRoomId = roomId;
  roomAccessRecoveryAllowedUntil = Date.now() + gameRoomAccessRecoveryWindowMs;
}

/**
 * Закрывает окно восстановления доступа.
 */
export function clearRoomAccessRecovery(roomId?: string): void {
  if (roomId && roomAccessRecoveryRoomId && roomAccessRecoveryRoomId !== roomId) return;
  roomAccessRecoveryRoomId = "";
  roomAccessRecoveryAllowedUntil = 0;
}

/**
 * Проверяет, можно ли сейчас повторить восстановление доступа.
 */
export function canRecoverRoomAccess(roomId: string): boolean {
  return (
    Boolean(roomId) &&
    roomAccessRecoveryRoomId === roomId &&
    Date.now() <= roomAccessRecoveryAllowedUntil
  );
}
