import { getSessionUser } from "../../state/session";
import { resolveProfilePath } from "../profile/profile-data";
import type { ChatViewMessage } from "./types";

/** Сортирует сообщения по времени создания `createdAt` в хронологическом порядке. */
export function sortMessagesByCreatedAt(messages: ChatViewMessage[]): ChatViewMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return leftTime - rightTime;
  });
}

/** Возвращает true, если ошибка, вероятно, связана с проблемами сети. */
export function isOfflineNetworkError(error: unknown): boolean {
  return !navigator.onLine || error instanceof TypeError;
}

/** Экранирует строку для безопасной вставки в HTML-атрибуты и текст. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Формирует URL аватара, направляя относительные ссылки через image proxy. */
export function getAvatarSrc(avatarLink?: string): string {
  if (!avatarLink) return "/assets/img/default-avatar.png";
  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
    return avatarLink;
  }
  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
}

/** Возвращает полное имя текущего пользователя или пустую строку. */
export function getCurrentUserFullName(): string {
  const currentUser = getSessionUser();
  return `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim();
}

/** Возвращает путь к профилю текущего пользователя. */
export function getCurrentUserProfilePath(): string {
  return "/profile";
}

/** Разбивает строку полного имени на части `firstName` и `lastName`. */
export function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Формирует путь к профилю по полному имени и необязательному profileId. */
export function resolvePersonPath(fullName: string, profileId?: string): string {
  if (profileId) return resolveProfilePath({ id: profileId });
  const { firstName, lastName } = splitFullName(fullName);
  return resolveProfilePath({ firstName, lastName });
}

/** Нормализует полное имя для поиска в map (нижний регистр, без лишних пробелов). */
export function getNormalisedPersonName(fullName: string): string {
  return fullName.trim().toLowerCase();
}

/** Форматирует дату в подпись вида `22 февр. 23:45`. */
export function formatChatTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

/** Форматирует дату в подпись времени вида `23:45` для пузырей сообщений. */
export function formatMessageTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

/** Возвращает человекочитаемую подпись статуса доставки сообщения. */
export function getMessageDeliveryLabel(message: ChatViewMessage): string {
  return formatMessageTime(message.createdAt);
}

/**
 * Возвращает true, если заголовок чата похож на имя человека
 * (2–3 слова из букв, разделённые пробелами, без служебных ключевых слов канала).
 */
export function looksLikeDirectPersonName(value: string): boolean {
  const title = value.trim();
  if (!title) return false;
  if (/(команд|команда|aris|support|поддерж|admin|админ|news|новост|чат)/i.test(title)) {
    return false;
  }
  const parts = title.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return false;
  return parts.every((part) => /^[A-Za-zА-Яа-яЁё-]+$/.test(part));
}

/** Возвращает true, если сообщение отправил текущий пользователь. */
export function isOwnMessage(authorId?: string, authorName?: string): boolean {
  const currentUser = getSessionUser();
  const currentUserId = String(currentUser?.id ?? "");
  const currentUserName = getCurrentUserFullName();

  if (authorId && currentUserId && String(authorId) === currentUserId) return true;
  if (authorName && currentUserName && authorName.trim() === currentUserName) return true;
  return false;
}

/** Обновляет параметр `chatId` в URL страницы чатов без перезагрузки. */
export function syncSelectedChatToUrl(chatId: string, options: { replace?: boolean } = {}): void {
  const nextUrl = new URL(window.location.href);
  if (chatId) {
    nextUrl.searchParams.set("chatId", chatId);
  } else {
    nextUrl.searchParams.delete("chatId");
  }

  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextPath === currentPath) return;

  if (options.replace) {
    window.history.replaceState({}, "", nextPath);
  } else {
    window.history.pushState({}, "", nextPath);
  }
}
