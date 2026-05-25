import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import { isRoomSystemMessage } from "../../../chat/model";
import { rememberRoomChatAuthorAvatar } from "./cache";
import { getProfileAvatarLink } from "./profile";
import type { RoomChatAvatarServiceOptions } from "./chat-types";

/**
 * Загружает аватар автора сообщения по profileId, если локального кэша недостаточно.
 */
export async function loadRoomChatAuthorAvatar(
  options: RoomChatAvatarServiceOptions,
  message: GameRoomMessage,
): Promise<string> {
  const authorProfileId = message.authorProfileId.trim();
  if (!authorProfileId) return "";

  const cachedAvatar = options.caches.gameAvatarLinkCache.get(authorProfileId);
  if (cachedAvatar) {
    rememberRoomChatAuthorAvatar(options.caches, message, cachedAvatar);
    return cachedAvatar;
  }

  let request = options.caches.gameRoomChatAuthorAvatarRequestCache.get(authorProfileId);
  if (!request) {
    request = options
      .loadProfile(authorProfileId)
      .then((profile) => {
        const avatarUrl = getProfileAvatarLink(profile);
        if (avatarUrl) {
          options.caches.gameAvatarLinkCache.set(authorProfileId, avatarUrl);
        }
        return avatarUrl;
      })
      .catch(() => "")
      .finally(() => {
        options.caches.gameRoomChatAuthorAvatarRequestCache.delete(authorProfileId);
      });
    options.caches.gameRoomChatAuthorAvatarRequestCache.set(authorProfileId, request);
  }

  const avatarUrl = await request;
  if (avatarUrl) {
    rememberRoomChatAuthorAvatar(options.caches, message, avatarUrl);
  }
  return avatarUrl;
}

/**
 * Подготавливает аватары авторов сообщений для рендера чата.
 */
export async function hydrateRoomChatAuthorAvatars(
  options: RoomChatAvatarServiceOptions,
  room: GameRoom | null,
  messages: GameRoomMessage[],
  getAuthorAvatar: (room: GameRoom | null, message: GameRoomMessage) => string,
): Promise<string[]> {
  const avatarLinks = messages.map((message) => getAuthorAvatar(room, message));
  const missingMessages = messages.filter(
    (message, index) => !avatarLinks[index] && !isRoomSystemMessage(message),
  );

  if (!missingMessages.length) {
    return avatarLinks;
  }

  const loadedAvatarLinks = await Promise.all(
    missingMessages.map((message) => loadRoomChatAuthorAvatar(options, message)),
  );
  return [...avatarLinks, ...loadedAvatarLinks].filter(Boolean);
}
