import type { GameRoom } from "../../../api/games";
import { getCurrentPlayer, isCurrentRoomCreator, shouldBlockFullRoomJoin } from "./selectors";

export type GameSessionUserLike = {
  id?: string | number | null;
};

export type GameCurrentUserServiceOptions = {
  getSessionUser: () => GameSessionUserLike | null | undefined;
};

/**
 * Создаёт сервис текущего пользователя для общих проверок комнаты.
 */
export function createGameCurrentUserService(options: GameCurrentUserServiceOptions) {
  /**
   * Возвращает profileId текущего пользователя из сессии.
   */
  function getCurrentProfileId(): string {
    return String(options.getSessionUser()?.id ?? "");
  }

  /**
   * Возвращает текущего игрока комнаты по серверному флагу или profileId.
   */
  function getCurrentRoomPlayer(room: GameRoom | null) {
    return getCurrentPlayer(room, getCurrentProfileId());
  }

  /**
   * Проверяет, является ли текущий пользователь создателем комнаты.
   */
  function isCurrentUserRoomCreator(room: GameRoom): boolean {
    return isCurrentRoomCreator(room, getCurrentProfileId());
  }

  /**
   * Проверяет, нужно ли заблокировать вход в заполненную комнату.
   */
  function shouldBlockCurrentUserFullRoomJoin(room: GameRoom): boolean {
    return shouldBlockFullRoomJoin(room, getCurrentProfileId());
  }

  /**
   * Проверяет, была ли комната создана текущим пользователем.
   */
  function isRoomCreatedByCurrentUser(room: GameRoom): boolean {
    const currentProfileId = getCurrentProfileId();
    return (
      Boolean(currentProfileId && room.createdByProfileId === currentProfileId) ||
      room.players.some((player) => player.isMe && player.profileId === room.createdByProfileId)
    );
  }

  return {
    getCurrentProfileId,
    getCurrentPlayer: getCurrentRoomPlayer,
    isCurrentRoomCreator: isCurrentUserRoomCreator,
    shouldBlockFullRoomJoin: shouldBlockCurrentUserFullRoomJoin,
    isRoomCreatedByCurrentUser,
  };
}
