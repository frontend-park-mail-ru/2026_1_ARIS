import type { GameRoom } from "../../../../../api/games";
import { prepareAvatarLinks } from "../../../../../utils/avatar";
import {
  getProfileGender,
  inferPlayerGenderByName,
  normalizeGamePlayerGender,
} from "../system-messages";
import { isPublicGuestPlayer } from "../public-guest";
import {
  createGameRoomAvatarCaches,
  rememberGamePlayerAvatar as rememberCachedGamePlayerAvatar,
} from "./cache";
import { createRoomChatAvatarService } from "./chat";
import { loadGameAvatarUrlById } from "./media";
import { getProfileAvatarLink } from "./profile";
import type { GamePlayer, GameRoomAvatarServiceOptions } from "./types";

/**
 * Создаёт сервис загрузки и кэширования аватаров игровой комнаты.
 */
export function createGameRoomAvatarService(options: GameRoomAvatarServiceOptions) {
  const caches = createGameRoomAvatarCaches();

  /**
   * Запоминает аватар игрока во всех кэшах сервиса.
   */
  function rememberGamePlayerAvatar(player: GamePlayer, avatarUrl = player.avatarUrl): void {
    rememberCachedGamePlayerAvatar(caches, player, avatarUrl);
  }

  /**
   * Возвращает актуальную ссылку на аватар игрока.
   */
  function getPlayerAvatarUrl(player: GamePlayer): string {
    let avatarUrl = "";
    if (player.isMe) {
      avatarUrl = options.getSessionUser()?.avatarLink || player.avatarUrl;
    } else {
      avatarUrl = caches.gameAvatarLinkCache.get(player.profileId) || player.avatarUrl;
    }
    rememberGamePlayerAvatar(player, avatarUrl);
    return avatarUrl;
  }

  const roomChatAvatarService = createRoomChatAvatarService({
    caches,
    getCurrentProfileId: options.getCurrentProfileId,
    getCurrentPlayer: options.getCurrentPlayer,
    getSessionUser: options.getSessionUser,
    loadProfile: options.loadProfile,
    getPlayerAvatarUrl,
    ...(options.loadAvatarUrlById ? { loadAvatarUrlById: options.loadAvatarUrlById } : {}),
  });

  /**
   * Загружает аватары создателя и игроков одной комнаты.
   */
  async function hydrateGameRoomAvatars(room: GameRoom, signal?: AbortSignal): Promise<GameRoom> {
    const creator = room.creator
      ? ((await hydrateGamePlayersAvatars([room.creator], signal))[0] ?? room.creator)
      : null;
    const players = await hydrateGamePlayersAvatars(room.players, signal);

    await prepareAvatarLinks([
      ...(creator ? [getPlayerAvatarUrl(creator)] : []),
      ...players.map((player) => getPlayerAvatarUrl(player)),
    ]);

    options.rememberRoomTitle?.(room.id, room.title);
    return { ...room, creator, players };
  }

  /**
   * Загружает и нормализует аватары игроков комнаты.
   */
  async function hydrateGamePlayersAvatars(
    items: GamePlayer[],
    signal?: AbortSignal,
  ): Promise<GamePlayer[]> {
    const currentProfileId = options.getCurrentProfileId();
    const players = await Promise.all(
      items.map(async (player) => {
        const isCurrentPlayer = currentProfileId
          ? player.profileId === currentProfileId
          : player.isMe;
        const directGender = normalizeGamePlayerGender(player.gender);
        if (player.profileId && directGender) {
          caches.gamePlayerGenderCache.set(player.profileId, directGender);
        }
        const sessionAvatar = isCurrentPlayer ? options.getSessionUser()?.avatarLink : "";
        let avatarUrl = player.avatarUrl;
        const isPublicGuest = isPublicGuestPlayer(player);
        let gender = isPublicGuest ? "male" : directGender || inferPlayerGenderByName(player);

        if (sessionAvatar) {
          avatarUrl = sessionAvatar;
        }

        const cachedAvatar = caches.gameAvatarLinkCache.get(player.profileId);
        if (!avatarUrl && cachedAvatar) {
          avatarUrl = cachedAvatar;
        }

        if (!avatarUrl) {
          avatarUrl = await loadGameAvatarUrlById(
            {
              caches,
              ...(options.loadAvatarUrlById
                ? { loadAvatarUrlById: options.loadAvatarUrlById }
                : {}),
            },
            player.avatarId,
            signal,
          );
        }

        if (isPublicGuest || !player.profileId || (avatarUrl && directGender)) {
          rememberGamePlayerAvatar(player, avatarUrl);
          return { ...player, isMe: isCurrentPlayer, avatarUrl, gender };
        }

        try {
          const profile = await options.loadProfile(player.profileId, signal);
          const avatarLink = getProfileAvatarLink(profile);
          const profileGender = getProfileGender(profile);
          if (avatarLink) {
            avatarUrl = avatarLink;
          }
          if (profileGender) {
            gender = profileGender;
            caches.gamePlayerGenderCache.set(player.profileId, profileGender);
          }
          rememberGamePlayerAvatar(player, avatarUrl);
          return { ...player, isMe: isCurrentPlayer, avatarUrl, gender };
        } catch {
          rememberGamePlayerAvatar(player, avatarUrl);
          return { ...player, isMe: isCurrentPlayer, avatarUrl, gender };
        }
      }),
    );
    return players;
  }

  /**
   * Загружает аватары для списка комнат.
   */
  async function hydrateGameRoomsAvatars(
    rooms: GameRoom[],
    signal?: AbortSignal,
  ): Promise<GameRoom[]> {
    return Promise.all(rooms.map((room) => hydrateGameRoomAvatars(room, signal)));
  }

  return {
    enrichOwnRoomChatMessage: roomChatAvatarService.enrichOwnRoomChatMessage,
    getPlayerAvatarUrl,
    getProfileAvatarLink,
    getRoomChatAuthorAvatar: roomChatAvatarService.getRoomChatAuthorAvatar,
    getRoomChatAuthorFirstName: roomChatAvatarService.getRoomChatAuthorFirstName,
    getRoomChatAuthorName: roomChatAvatarService.getRoomChatAuthorName,
    getRoomChatPlayer: roomChatAvatarService.getRoomChatPlayer,
    hydrateGamePlayersAvatars,
    hydrateGameRoomAvatars,
    hydrateGameRoomsAvatars,
    hydrateRoomChatAuthorAvatars: roomChatAvatarService.hydrateRoomChatAuthorAvatars,
    rememberGamePlayerAvatar,
  };
}

export type GameRoomAvatarService = ReturnType<typeof createGameRoomAvatarService>;
