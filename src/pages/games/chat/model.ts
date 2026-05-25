/**
 * Модель чата игровой комнаты.
 *
 * Публичный barrel для чистых операций над сообщениями и локальным кэшем
 * системных сообщений.
 */
export {
  getRoomChatMessageMergeKey,
  mergeRoomChatMessageDetails,
  mergeRoomChatMessages,
} from "./model/merge";
export { getRoomChatMessageTime, sortRoomChatMessages } from "./model/sorting";
export {
  createRoomSystemMessage,
  getStoredRoomSystemMessages,
  isRoomSystemMessage,
  readStoredRoomSystemMessages,
  rememberRoomSystemMessages,
} from "./model/system";
export type { MergeRoomChatMessagesOptions } from "./model/types";
