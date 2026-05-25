import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { mergeRoomChatMessages as mergeRoomChatMessagesBase } from "../chat/model";
import {
  getRoomSystemMessages as getRoomSystemMessagesBase,
  normalizeRenderedSystemMessageText,
} from "./profile/system-messages";

export type RoomMessagesServiceOptions = {
  consumeDisconnectRemoval: (roomId: string, profileId: string) => boolean;
};

/**
 * Создаёт сервис сообщений комнаты с нормализацией системных событий.
 */
export function createRoomMessagesService(options: RoomMessagesServiceOptions) {
  /**
   * Собирает системные сообщения по diff двух снимков комнаты.
   */
  function getRoomSystemMessages(
    previousRoom: GameRoom | null,
    nextRoom: GameRoom,
  ): GameRoomMessage[] {
    return getRoomSystemMessagesBase(previousRoom, nextRoom, {
      consumeDisconnectRemoval: options.consumeDisconnectRemoval,
    });
  }

  /**
   * Объединяет сообщения чата комнаты с нормализацией системного текста.
   */
  function mergeRoomChatMessages(
    existing: GameRoomMessage[],
    incoming: GameRoomMessage[],
  ): GameRoomMessage[] {
    return mergeRoomChatMessagesBase(existing, incoming, {
      normalizeSystemMessageText: normalizeRenderedSystemMessageText,
    });
  }

  return {
    getRoomSystemMessages,
    mergeRoomChatMessages,
  };
}
