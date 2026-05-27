import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import { gameT } from "../../../shared/i18n";
import { getPlayerFullName } from "../players";
import { getCachedRoomChatAuthorAvatar, rememberRoomChatAuthorAvatar } from "./cache";
import type { RoomChatAvatarServiceOptions } from "./chat-types";

/**
 * Дополняет собственное сообщение данными текущего пользователя.
 */
export function enrichOwnRoomChatMessage(
  options: RoomChatAvatarServiceOptions,
  room: GameRoom,
  message: GameRoomMessage,
): GameRoomMessage {
  const player = options.getCurrentPlayer(room);
  const user = options.getSessionUser();
  const fallbackName = player
    ? getPlayerFullName(player)
    : [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.login ||
      gameT("common.playerFallback");
  const avatarUrl =
    (player ? options.getPlayerAvatarUrl(player) : "") ||
    user?.avatarLink ||
    message.authorAvatarUrl ||
    getCachedRoomChatAuthorAvatar(options.caches, message);

  const enrichedMessage: GameRoomMessage = {
    ...message,
    roomId: message.roomId || room.id,
    authorProfileId: message.authorProfileId || player?.profileId || options.getCurrentProfileId(),
    authorUserAccountId: message.authorUserAccountId || player?.userAccountId || "",
    authorName: message.authorName || fallbackName,
    authorFirstName:
      message.authorFirstName || player?.firstName || user?.firstName || fallbackName,
    authorLastName: message.authorLastName || player?.lastName || user?.lastName || "",
    authorUsername: message.authorUsername || player?.username || user?.login || "",
    authorAvatarId: message.authorAvatarId || player?.avatarId || "",
    authorAvatarUrl: avatarUrl,
  };

  if (avatarUrl) {
    rememberRoomChatAuthorAvatar(options.caches, enrichedMessage, avatarUrl);
  }

  return enrichedMessage;
}
