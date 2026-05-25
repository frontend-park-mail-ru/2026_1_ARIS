import type { GameRoomMessage } from "../../../../api/games";
import {
  gameRoomSystemMessagesStorageKey,
  maxStoredRoomSystemMessages,
} from "../../shared/constants";
import { sortRoomChatMessages } from "./sorting";

let roomSystemMessageCounter = 0;

/**
 * Проверяет, является ли сообщение системным.
 */
export function isRoomSystemMessage(message: GameRoomMessage): boolean {
  return message.id.startsWith("system:");
}

/**
 * Создаёт системное сообщение комнаты.
 */
export function createRoomSystemMessage(roomId: string, text: string): GameRoomMessage {
  roomSystemMessageCounter += 1;
  return {
    id: `system:${roomId}:${Date.now()}:${roomSystemMessageCounter}`,
    roomId,
    authorProfileId: "",
    authorUserAccountId: "",
    authorName: "Сервер",
    authorFirstName: "Сервер",
    authorLastName: "",
    authorUsername: "server",
    authorAvatarId: "",
    authorAvatarUrl: "",
    text,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Читает кэш системных сообщений из localStorage.
 */
export function readStoredRoomSystemMessages(): Record<string, GameRoomMessage[]> {
  try {
    const raw = window.localStorage.getItem(gameRoomSystemMessagesStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, GameRoomMessage[]> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([roomId, value]) => {
      if (!Array.isArray(value)) return;
      result[roomId] = value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const rawMessage = item as Partial<GameRoomMessage>;
          const id = String(rawMessage.id ?? "");
          const text = String(rawMessage.text ?? "");
          if (!id.startsWith("system:") || !text) return null;
          return {
            id,
            roomId: String(rawMessage.roomId ?? roomId),
            authorProfileId: "",
            authorUserAccountId: "",
            authorName: "Сервер",
            authorFirstName: "Сервер",
            authorLastName: "",
            authorUsername: "server",
            authorAvatarId: "",
            authorAvatarUrl: "",
            text,
            createdAt: String(rawMessage.createdAt ?? new Date().toISOString()),
          };
        })
        .filter((message): message is GameRoomMessage => Boolean(message));
    });
    return result;
  } catch {
    return {};
  }
}

/**
 * Возвращает сохранённые системные сообщения указанной комнаты.
 */
export function getStoredRoomSystemMessages(roomId: string): GameRoomMessage[] {
  if (!roomId) return [];
  return sortRoomChatMessages(
    (readStoredRoomSystemMessages()[roomId] ?? []).filter((message) => message.roomId === roomId),
  );
}

/**
 * Сохраняет системные сообщения в локальный кэш.
 */
export function rememberRoomSystemMessages(messages: GameRoomMessage[]): void {
  const systemMessages = messages.filter(
    (message) => isRoomSystemMessage(message) && message.roomId,
  );
  if (!systemMessages.length) return;

  try {
    const stored = readStoredRoomSystemMessages();
    const roomIds = new Set(systemMessages.map((message) => message.roomId));
    roomIds.forEach((roomId) => {
      const roomMessages = systemMessages.filter((message) => message.roomId === roomId);
      const byId = new Map<string, GameRoomMessage>();
      [...(stored[roomId] ?? []), ...roomMessages].forEach((message) => {
        byId.set(message.id, message);
      });
      stored[roomId] = sortRoomChatMessages(Array.from(byId.values())).slice(
        -maxStoredRoomSystemMessages,
      );
    });
    window.localStorage.setItem(gameRoomSystemMessagesStorageKey, JSON.stringify(stored));
  } catch {
    // Локальный кэш системных сообщений не критичен для работы чата.
  }
}
