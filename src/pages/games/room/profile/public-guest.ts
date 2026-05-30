import type { GameRoom, GameRoomMessage } from "../../../../api/games";

function isGuestUsername(value: string): boolean {
  return value.trim().toLowerCase() === "guest";
}

function isEmptyAccountId(value: string): boolean {
  const accountId = value.trim();
  return !accountId || accountId === "0";
}

/**
 * Временный участник публичного лобби не имеет настоящего пользовательского профиля.
 */
export function isPublicGuestPlayer(
  player: GameRoom["players"][number] | null | undefined,
): boolean {
  return Boolean(
    player && isGuestUsername(player.username) && isEmptyAccountId(player.userAccountId),
  );
}

/**
 * Автор сообщения от временного участника публичного лобби.
 */
export function isPublicGuestMessageAuthor(message: GameRoomMessage): boolean {
  return isGuestUsername(message.authorUsername) && isEmptyAccountId(message.authorUserAccountId);
}
