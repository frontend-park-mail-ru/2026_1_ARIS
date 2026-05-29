import type { GameRoomMessage } from "../../../../../api/games";
import { gameT } from "../../../shared/i18n";
import { getPlayerFullName } from "../players";
import type { GamePlayer, GameRoomAvatarCaches } from "./types";

/**
 * Создаёт изолированные кэши сервиса аватаров комнаты.
 */
export function createGameRoomAvatarCaches(): GameRoomAvatarCaches {
  return {
    gameAvatarLinkCache: new Map<string, string>(),
    gameAvatarMediaUrlCache: new Map<string, string>(),
    gameRoomChatAuthorAvatarCache: new Map<string, string>(),
    gameRoomChatAuthorAvatarRequestCache: new Map<string, Promise<string>>(),
    gamePlayerGenderCache: new Map<string, GamePlayer["gender"]>(),
  };
}

/**
 * Возвращает ключи, по которым можно сопоставить автора чата и аватар.
 */
export function getRoomChatAuthorAvatarCacheKeys(message: GameRoomMessage): string[] {
  const authorProfileId = message.authorProfileId.trim();
  const authorUserAccountId = message.authorUserAccountId.trim();
  const authorUsername = message.authorUsername.trim().toLowerCase();
  const authorName = message.authorName.trim().toLowerCase();
  const authorFullName = `${message.authorFirstName} ${message.authorLastName}`
    .trim()
    .toLowerCase();
  return [
    authorProfileId ? `profile:${authorProfileId}` : "",
    authorUserAccountId ? `account:${authorUserAccountId}` : "",
    authorUsername ? `username:${authorUsername}` : "",
    authorName ? `name:${authorName}` : "",
    authorFullName ? `name:${authorFullName}` : "",
  ].filter(Boolean);
}

/**
 * Возвращает аватар автора чата из локального кэша.
 */
export function getCachedRoomChatAuthorAvatar(
  caches: GameRoomAvatarCaches,
  message: GameRoomMessage,
): string {
  for (const key of getRoomChatAuthorAvatarCacheKeys(message)) {
    const avatarUrl = caches.gameRoomChatAuthorAvatarCache.get(key);
    if (avatarUrl) return avatarUrl;
  }
  return "";
}

/**
 * Запоминает аватар автора чата по всем доступным идентификаторам.
 */
export function rememberRoomChatAuthorAvatar(
  caches: GameRoomAvatarCaches,
  message: GameRoomMessage,
  avatarUrl: string,
): void {
  if (!avatarUrl) return;
  getRoomChatAuthorAvatarCacheKeys(message).forEach((key) => {
    caches.gameRoomChatAuthorAvatarCache.set(key, avatarUrl);
  });
  if (message.authorProfileId) {
    caches.gameAvatarLinkCache.set(message.authorProfileId, avatarUrl);
  }
}

/**
 * Запоминает аватар игрока для списка игроков и последующего рендера чата.
 */
export function rememberGamePlayerAvatar(
  caches: GameRoomAvatarCaches,
  player: GamePlayer,
  avatarUrl = player.avatarUrl,
): void {
  if (!avatarUrl) return;
  const username = player.username.trim().toLowerCase();
  const fullName = getPlayerFullName(player).trim();
  const fallbackName = gameT("common.playerFallback");
  const normalizedFullName =
    fullName && fullName !== fallbackName && fullName !== "Игрок" ? fullName.toLowerCase() : "";
  const keys = [
    player.profileId ? `profile:${player.profileId}` : "",
    player.userAccountId ? `account:${player.userAccountId}` : "",
    username ? `username:${username}` : "",
    normalizedFullName ? `name:${normalizedFullName}` : "",
  ].filter(Boolean);

  keys.forEach((key) => {
    caches.gameRoomChatAuthorAvatarCache.set(key, avatarUrl);
  });
  if (player.profileId) {
    caches.gameAvatarLinkCache.set(player.profileId, avatarUrl);
  }
}
