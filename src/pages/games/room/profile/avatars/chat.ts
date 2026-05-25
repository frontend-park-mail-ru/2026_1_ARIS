import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import {
  getRoomChatAuthorFirstName,
  getRoomChatAuthorName,
  getRoomChatPlayer,
} from "./chat-author";
import { getRoomChatAuthorAvatar as getRoomChatAuthorAvatarValue } from "./chat-avatar";
import { hydrateRoomChatAuthorAvatars as hydrateRoomChatAuthorAvatarValues } from "./chat-loader";
import { enrichOwnRoomChatMessage as enrichOwnRoomChatMessageValue } from "./chat-own-message";
import type { RoomChatAvatarServiceOptions } from "./chat-types";

/**
 * Создаёт сервис аватаров и подписей авторов комнатного чата.
 */
export function createRoomChatAvatarService(options: RoomChatAvatarServiceOptions) {
  /**
   * Возвращает аватар автора сообщения с учётом игроков комнаты и кэша.
   */
  function getRoomChatAuthorAvatar(room: GameRoom | null, message: GameRoomMessage): string {
    return getRoomChatAuthorAvatarValue(options, room, message);
  }

  /**
   * Дополняет собственное сообщение данными текущего пользователя.
   */
  function enrichOwnRoomChatMessage(room: GameRoom, message: GameRoomMessage): GameRoomMessage {
    return enrichOwnRoomChatMessageValue(options, room, message);
  }

  /**
   * Подготавливает аватары авторов сообщений для рендера чата.
   */
  async function hydrateRoomChatAuthorAvatars(
    room: GameRoom | null,
    messages: GameRoomMessage[],
  ): Promise<string[]> {
    return hydrateRoomChatAuthorAvatarValues(options, room, messages, getRoomChatAuthorAvatar);
  }

  return {
    enrichOwnRoomChatMessage,
    getRoomChatAuthorAvatar,
    getRoomChatAuthorFirstName,
    getRoomChatAuthorName,
    getRoomChatPlayer,
    hydrateRoomChatAuthorAvatars,
  };
}
