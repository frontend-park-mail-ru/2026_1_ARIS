import { ApiError } from "../../../api/core/client";
import { extractGameRoomFromResponse, type GameRoom } from "../../../api/games";

/** Проверяет отмену async-операции через AbortController. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Возвращает безопасный текст ошибки для UI страницы игр. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const message = error.message.trim();
  const looksLikeHtml = /<\s*html[\s>]/i.test(message) || /<\s*body[\s>]/i.test(message);

  if (looksLikeHtml) {
    return "Игровой сервис пока недоступен. Сервер вернул HTML-страницу ошибки вместо JSON.";
  }

  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}

/** Возвращает текст ошибки загрузки списка комнат. */
export function getRoomsErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Текущий сервер не отдает список комнат. Можно создать комнату или войти по коду приглашения.";
  }

  return getErrorMessage(error, "Не удалось загрузить список комнат.");
}

/** Проверяет ошибку входа, когда комната не найдена. */
export function isJoinRoomNotFoundError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const message = error.message.toLowerCase();
  return error.status === 404 || message.includes("не найден") || message.includes("not found");
}

/** Проверяет ошибку входа, когда нужен или неверен пароль. */
export function isJoinRoomPasswordError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const message = error.message.toLowerCase();
  return error.status === 403 || message.includes("парол") || message.includes("password");
}

/** Проверяет ошибку входа в уже начавшуюся комнату. */
export function isJoinRoomAlreadyStartedError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("игра уже началась") || message.includes("already started");
}

/** Проверяет ошибку входа в заполненную комнату. */
export function isJoinRoomFullError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("комната заполнена") || message.includes("room is full");
}

/** Извлекает существующую комнату из ошибки конфликта создания комнаты. */
export function getExistingCreatedRoomFromError(error: unknown): GameRoom | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status !== 409) return null;
  const message = error.message.toLowerCase();
  if (!message.includes("своя созданная комната") && !message.includes("created room")) {
    return null;
  }
  return extractGameRoomFromResponse(error.data);
}
