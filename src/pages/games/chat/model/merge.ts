import type { GameRoomMessage } from "../../../../api/games";
import { sortRoomChatMessages } from "./sorting";
import { isRoomSystemMessage, rememberRoomSystemMessages } from "./system";
import type { MergeRoomChatMessagesOptions } from "./types";

/**
 * Объединяет два варианта одного сообщения без потери уже известных полей.
 */
export function mergeRoomChatMessageDetails(
  existing: GameRoomMessage,
  incoming: GameRoomMessage,
): GameRoomMessage {
  return {
    ...existing,
    ...incoming,
    roomId: incoming.roomId || existing.roomId,
    authorProfileId: incoming.authorProfileId || existing.authorProfileId,
    authorUserAccountId: incoming.authorUserAccountId || existing.authorUserAccountId,
    authorName: incoming.authorName || existing.authorName,
    authorFirstName: incoming.authorFirstName || existing.authorFirstName,
    authorLastName: incoming.authorLastName || existing.authorLastName,
    authorUsername: incoming.authorUsername || existing.authorUsername,
    authorAvatarId: incoming.authorAvatarId || existing.authorAvatarId,
    authorAvatarUrl: incoming.authorAvatarUrl || existing.authorAvatarUrl,
    text: incoming.text || existing.text,
    createdAt: incoming.createdAt || existing.createdAt,
  };
}

/**
 * Возвращает ключ дедупликации сообщения.
 */
export function getRoomChatMessageMergeKey(
  message: GameRoomMessage,
  options: MergeRoomChatMessagesOptions = {},
): string {
  if (isRoomSystemMessage(message)) {
    const normalize = options.normalizeSystemMessageText ?? ((text: string) => text);
    return `system:${message.roomId}:${normalize(message.text)}`;
  }
  return message.id;
}

/**
 * Объединяет существующие и входящие сообщения комнаты.
 */
export function mergeRoomChatMessages(
  existing: GameRoomMessage[],
  incoming: GameRoomMessage[],
  options: MergeRoomChatMessagesOptions = {},
): GameRoomMessage[] {
  const messages = new Map<string, GameRoomMessage>();
  [...existing, ...incoming].forEach((message) => {
    if (!message.id) return;
    const messageKey = getRoomChatMessageMergeKey(message, options);
    const previousMessage = messages.get(messageKey);
    messages.set(
      messageKey,
      previousMessage ? mergeRoomChatMessageDetails(previousMessage, message) : message,
    );
  });

  const mergedMessages = sortRoomChatMessages(Array.from(messages.values()));
  rememberRoomSystemMessages(mergedMessages);
  return mergedMessages;
}
