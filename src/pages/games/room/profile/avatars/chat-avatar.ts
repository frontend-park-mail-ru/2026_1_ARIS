import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import { isRoomSystemMessage } from "../../../chat/model";
import { getCachedRoomChatAuthorAvatar, rememberRoomChatAuthorAvatar } from "./cache";
import { getRoomChatPlayer } from "./chat-author";
import type { RoomChatAvatarServiceOptions } from "./chat-types";

/**
 * Возвращает аватар автора сообщения с учётом игроков комнаты и кэша.
 */
export function getRoomChatAuthorAvatar(
  options: RoomChatAvatarServiceOptions,
  room: GameRoom | null,
  message: GameRoomMessage,
): string {
  if (isRoomSystemMessage(message)) return "";
  const player = getRoomChatPlayer(room, message);
  const playerAvatar = player ? options.getPlayerAvatarUrl(player) : "";
  const avatarUrl =
    playerAvatar ||
    message.authorAvatarUrl ||
    getCachedRoomChatAuthorAvatar(options.caches, message);
  if (avatarUrl) {
    rememberRoomChatAuthorAvatar(options.caches, message, avatarUrl);
  }
  return avatarUrl;
}
