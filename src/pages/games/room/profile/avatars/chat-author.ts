import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import { isRoomSystemMessage } from "../../../chat/model";
import type { GamePlayer } from "./types";

/**
 * Возвращает игрока комнаты, связанного с сообщением чата.
 */
export function getRoomChatPlayer(
  room: GameRoom | null,
  message: GameRoomMessage,
): GamePlayer | null {
  if (isRoomSystemMessage(message)) return null;
  const authorProfileId = message.authorProfileId.trim();
  const authorUserAccountId = message.authorUserAccountId.trim();
  const authorUsername = message.authorUsername.trim();
  if (!authorProfileId && !authorUserAccountId && !authorUsername) return null;

  return (
    room?.players.find(
      (player) =>
        (authorProfileId && player.profileId === authorProfileId) ||
        (authorUserAccountId && player.userAccountId === authorUserAccountId) ||
        (authorUsername && player.username === authorUsername),
    ) ?? null
  );
}

/**
 * Возвращает имя автора сообщения для списка чата.
 */
export function getRoomChatAuthorName(room: GameRoom | null, message: GameRoomMessage): string {
  if (isRoomSystemMessage(message)) return "Сервер";
  const player = getRoomChatPlayer(room, message);
  return (
    message.authorName.trim() ||
    player?.name ||
    `${message.authorFirstName} ${message.authorLastName}`.trim() ||
    message.authorUsername ||
    "Игрок"
  );
}

/**
 * Возвращает короткое имя автора сообщения для аватара.
 */
export function getRoomChatAuthorFirstName(
  room: GameRoom | null,
  message: GameRoomMessage,
): string {
  if (isRoomSystemMessage(message)) return "Сервер";
  const directName = message.authorFirstName.trim();
  if (directName) return directName;

  const fullName = getRoomChatAuthorName(room, message).trim();
  return fullName.split(/\s+/)[0] || "Игрок";
}
