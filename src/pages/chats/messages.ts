/**
 * Загрузка, отправка и синхронизация сообщений страницы чатов.
 */
import { getChatMessages, sendChatMessage } from "../../api/chat";
import type { ChatMessage } from "../../api/chat";
import { getProfileById } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { chatsState } from "./state";
import { persistChatsData } from "./storage";
import {
  sortMessagesByCreatedAt,
  isOfflineNetworkError,
  getCurrentUserProfilePath,
  isOwnMessage,
  resolvePersonPath,
} from "./helpers";
import {
  updateThreadPreview,
  syncThreadProfilePathFromMessages,
  sortThreadsByUpdatedAt,
} from "./threads";
import {
  refreshChatsPage,
  keepSelectedChatPinnedToBottom,
  scheduleScrollChatToBottom,
  isSelectedChatPinnedToBottomRef,
  shouldScrollChatToBottomRef,
} from "./render";
import { chatsRoot } from "./state";
import type { ChatViewMessage, ChatViewThread } from "./types";

const chatAuthorAvatarLinkByProfileId = new Map<string, string | undefined>();

function syncThreadIdentityFromRawMessages(
  thread: ChatViewThread,
  messages: ChatMessage[],
  authorAvatarLinks?: ReadonlyMap<string, string | undefined>,
): void {
  const otherMessage = messages.find(
    (message) => !isOwnMessage(message.authorId, message.authorName),
  );
  if (!otherMessage) return;

  const otherProfileId = String(otherMessage.authorId ?? "").trim();
  if (otherProfileId) {
    thread.profileId = otherProfileId;
    thread.profilePath = resolvePersonPath(otherMessage.authorName ?? thread.title, otherProfileId);
  }

  if (otherProfileId && authorAvatarLinks?.has(otherProfileId)) {
    thread.avatarLink = authorAvatarLinks.get(otherProfileId) ?? undefined;
  }
}

/** Удаляет дубликаты сообщений по id, сохраняя последнее вхождение. */
export function dedupeMessagesById(messages: ChatViewMessage[]): ChatViewMessage[] {
  const byId = new Map<string, ChatViewMessage>();
  messages.forEach((m) => byId.set(m.id, m));
  return Array.from(byId.values());
}

/** Возвращает стабильный отпечаток списка сообщений для определения изменений. */
export function getMessagesFingerprint(messages: ChatViewMessage[] | undefined): string {
  return (messages ?? []).map((m) => `${m.id}:${m.createdAt ?? ""}:${m.text}`).join("|");
}

/** Возвращает ключ дедупликации для входящего сообщения, используемый при отслеживании непрочитанных. */
export function getUnreadMessageKey(message: ChatViewMessage): string {
  if (message.id) return `id:${message.id}`;
  return `fallback:${message.authorName}:${message.createdAt ?? ""}:${message.text}`;
}

/** Возвращает локальные сообщения, которые ещё не подтверждены сервером. */
export function getUnconfirmedMessages(thread: ChatViewThread): ChatViewMessage[] {
  return [...(thread.messages ?? [])].filter(
    (m) =>
      m.isOwn &&
      m.id.startsWith("local-") &&
      (m.deliveryState === "failed" || m.deliveryState === "sending"),
  );
}

/** Объединяет неподтверждённые локальные сообщения со свежим списком из API, чтобы не терять optimistic UI. */
export function mergeRetriableMessages(
  messages: ChatViewMessage[],
  thread: ChatViewThread,
): ChatViewMessage[] {
  const unconfirmed = getUnconfirmedMessages(thread);
  if (!unconfirmed.length) return messages;
  return sortMessagesByCreatedAt(dedupeMessagesById([...messages, ...unconfirmed]));
}

export function addPendingOutgoing(chatId: string, message: ChatViewMessage): void {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId) ?? [];
  pending.push({ localId: message.id, text: message.text, createdAt: message.createdAt });
  chatsState.pendingOutgoingByChatId.set(chatId, pending);
}

export function removePendingOutgoing(chatId: string, localId: string): void {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId);
  if (!pending?.length) return;
  const next = pending.filter((item) => item.localId !== localId);
  if (next.length) {
    chatsState.pendingOutgoingByChatId.set(chatId, next);
  } else {
    chatsState.pendingOutgoingByChatId.delete(chatId);
  }
}

export function queueOutgoingForRetry(chatId: string, message: ChatViewMessage): void {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId) ?? [];
  const next = pending.filter((item) => item.localId !== message.id);
  next.push({ localId: message.id, text: message.text, createdAt: message.createdAt });
  chatsState.pendingOutgoingByChatId.set(chatId, next);
}

export function markUnreadIncoming(chatId: string, messageIds: string[]): void {
  if (!messageIds.length) return;
  const unreadIds = chatsState.unreadIncomingIdsByChatId.get(chatId) ?? new Set<string>();
  messageIds.forEach((id) => {
    if (id) unreadIds.add(id);
  });
  chatsState.unreadIncomingIdsByChatId.set(chatId, unreadIds);
}

export function clearUnreadIncoming(chatId: string): void {
  chatsState.unreadIncomingIdsByChatId.delete(chatId);
}

export function getUnreadIncomingCount(chatId: string): number {
  return chatsState.unreadIncomingIdsByChatId.get(chatId)?.size ?? 0;
}

/**
 * Возвращает свежие ссылки на аватары авторов сообщений по их profileId.
 *
 * Используем профиль как источник истины, потому что список чатов
 * и сохранённые треды могут держать устаревший `avatarLink`
 * после смены аватара собеседником.
 */
async function resolveAuthorAvatarLinks(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<Map<string, string | undefined>> {
  const profileIds = Array.from(
    new Set(
      messages
        .filter((message) => !isOwnMessage(message.authorId, message.authorName))
        .map((message) => String(message.authorId ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!profileIds.length) {
    return new Map();
  }

  const avatarEntries = await Promise.all(
    profileIds.map(async (profileId) => {
      if (chatAuthorAvatarLinkByProfileId.has(profileId)) {
        const cachedAvatarLink = chatAuthorAvatarLinkByProfileId.get(profileId);
        return [profileId, cachedAvatarLink] as const;
      }

      try {
        const profile = await getProfileById(profileId, signal);
        const avatarLink = String(profile.imageLink ?? "").trim();
        const nextAvatarLink = avatarLink || undefined;
        chatAuthorAvatarLinkByProfileId.set(profileId, nextAvatarLink);
        return [profileId, nextAvatarLink] as const;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
      }

      return [profileId, undefined] as const;
    }),
  );

  return new Map(avatarEntries);
}

/** Преобразует сырое сообщение API в модель представления для текущего треда. */
export function mapMessageToViewMessage(
  message: ChatMessage,
  thread: ChatViewThread,
  authorAvatarLinks?: ReadonlyMap<string, string | undefined>,
): ChatViewMessage {
  const currentUser = getSessionUser();
  const own = isOwnMessage(message.authorId, message.authorName);
  const authorProfileId = String(message.authorId ?? "").trim();
  const authorAvatarLink =
    !own && authorProfileId
      ? authorAvatarLinks?.has(authorProfileId)
        ? (authorAvatarLinks.get(authorProfileId) ?? undefined)
        : thread.avatarLink
      : currentUser?.avatarLink;

  return {
    id: message.id,
    text: message.text,
    authorName:
      message.authorName ??
      (own
        ? `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim()
        : thread.title),
    isOwn: own,
    createdAt: message.createdAt,
    avatarLink: authorAvatarLink,
    profilePath: own
      ? getCurrentUserProfilePath()
      : resolvePersonPath(message.authorName ?? thread.title, message.authorId || undefined),
  };
}

/**
 * Пытается сопоставить входящее сообщение WebSocket с ожидающим локальным сообщением.
 * Возвращает true, если сопоставление удалось (сообщение уже было в ожидании).
 */
export function reconcilePendingOutgoing(
  chatId: string,
  incomingMessage: ChatViewMessage,
  thread: ChatViewThread,
): boolean {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId);
  if (!pending?.length) return false;

  const incomingCreatedAt = incomingMessage.createdAt
    ? new Date(incomingMessage.createdAt).getTime()
    : 0;

  const matchedPending = pending.find((item) => {
    if (item.text !== incomingMessage.text) return false;
    const pendingCreatedAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (!incomingCreatedAt || !pendingCreatedAt) return true;
    return Math.abs(incomingCreatedAt - pendingCreatedAt) <= 15000;
  });

  if (!matchedPending) return false;

  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById(
      (thread.messages ?? []).map((m) =>
        m.id === matchedPending.localId
          ? {
              ...m,
              id: incomingMessage.id,
              createdAt: incomingMessage.createdAt,
              authorName: incomingMessage.authorName,
              avatarLink: incomingMessage.avatarLink,
              isOwn: true,
              profilePath: getCurrentUserProfilePath(),
            }
          : m,
      ),
    ),
  );
  syncThreadProfilePathFromMessages(thread);
  removePendingOutgoing(chatId, matchedPending.localId);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();
  persistChatsData(chatsState.threads);
  refreshChatsPage(chatsRoot);
  return true;
}

/** Обрабатывает входящее WebSocket-сообщение для чата. */
export function appendIncomingMessage(chatId: string, message: ChatMessage): void {
  const thread = chatsState.threads.find((t) => t.id === chatId);
  if (!thread || thread.source !== "api") return;

  syncThreadIdentityFromRawMessages(thread, [message], chatAuthorAvatarLinkByProfileId);

  const isNotOwn = !isOwnMessage(message.authorId, message.authorName);
  const shouldNotify =
    chatId === chatsState.selectedChatId && isNotOwn && !isSelectedChatPinnedToBottomRef();

  const incomingMessage = mapMessageToViewMessage(message, thread);
  if (reconcilePendingOutgoing(chatId, incomingMessage, thread)) return;

  const currentMessages = thread.messages ?? [];
  if (currentMessages.some((m) => m.id === incomingMessage.id)) return;

  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById([...currentMessages, incomingMessage]),
  );
  syncThreadProfilePathFromMessages(thread);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();

  if (chatId === chatsState.selectedChatId && isSelectedChatPinnedToBottomRef()) {
    shouldScrollChatToBottomRef.set(true);
  } else if (shouldNotify) {
    markUnreadIncoming(chatId, [getUnreadMessageKey(incomingMessage)]);
  }

  persistChatsData(chatsState.threads);
  refreshChatsPage(chatsRoot);
}

/** Загружает сообщения чата из API и объединяет их с данными треда. */
export async function ensureMessagesLoaded(
  chatId: string,
  options: { background?: boolean; force?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const thread = chatsState.threads.find((t) => t.id === chatId);
  if (!thread || thread.source !== "api") return;
  if (!options.force && thread.messages) return;

  const hadMessages = Boolean(thread.messages);
  if (!options.background) chatsState.loadingMessages = true;

  try {
    const previousMessages = thread.messages ?? [];
    const rawMessages = await getChatMessages(chatId, options.signal);
    const authorAvatarLinks = await resolveAuthorAvatarLinks(rawMessages, options.signal);
    syncThreadIdentityFromRawMessages(thread, rawMessages, authorAvatarLinks);

    const nextMessages = mergeRetriableMessages(
      sortMessagesByCreatedAt(
        dedupeMessagesById(
          rawMessages.map((m) => mapMessageToViewMessage(m, thread, authorAvatarLinks)),
        ),
      ),
      thread,
    );

    const previousFingerprint = getMessagesFingerprint(previousMessages);
    const nextFingerprint = getMessagesFingerprint(nextMessages);

    thread.messages = nextMessages;
    syncThreadProfilePathFromMessages(thread);
    updateThreadPreview(thread);
    sortThreadsByUpdatedAt();
    persistChatsData(chatsState.threads);

    if (!options.background) {
      chatsState.errorMessage = "";
      chatsState.actionErrorMessage = "";
    }

    if (options.background && previousFingerprint !== nextFingerprint) {
      const shouldNotify =
        chatId === chatsState.selectedChatId && !isSelectedChatPinnedToBottomRef();
      const shouldStickToBottom =
        chatId === chatsState.selectedChatId && isSelectedChatPinnedToBottomRef();

      if (shouldNotify) {
        const previousKeys = new Set(previousMessages.map(getUnreadMessageKey));
        const nextUnreadKeys = nextMessages
          .filter((m) => !m.isOwn)
          .map(getUnreadMessageKey)
          .filter((key) => !previousKeys.has(key));
        markUnreadIncoming(chatId, nextUnreadKeys);
      }

      if (shouldStickToBottom) shouldScrollChatToBottomRef.set(true);

      refreshChatsPage(chatsRoot);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (!hadMessages) thread.messages = [];
    if (!options.background) {
      chatsState.errorMessage =
        error instanceof Error ? error.message : "Не получилось загрузить сообщения.";
    }
    console.info("[chats] source=api scope=messages error", {
      chatId,
      error: error instanceof Error ? error.message : "Не получилось загрузить сообщения.",
    });
  } finally {
    if (!options.background) chatsState.loadingMessages = false;
  }
}

/** Повторяет отправку сообщения с ошибкой. */
export async function retryChatMessage(chatId: string, localMessageId: string): Promise<void> {
  const thread = chatsState.threads.find((t) => t.id === chatId);
  const message = thread?.messages?.find((m) => m.id === localMessageId);

  if (!thread || !message || message.deliveryState !== "failed") return;

  if (!navigator.onLine) {
    chatsState.actionErrorMessage = "Нет соединения с интернетом.";
    keepSelectedChatPinnedToBottom();
    refreshChatsPage(chatsRoot);
    scheduleScrollChatToBottom(chatsRoot);
    return;
  }

  thread.messages = (thread.messages ?? []).map((m) =>
    m.id === localMessageId ? { ...m, deliveryState: "sending" } : m,
  );
  queueOutgoingForRetry(chatId, { ...message, deliveryState: "sending" });
  chatsState.actionErrorMessage = "";
  persistChatsData(chatsState.threads);
  refreshChatsPage(chatsRoot);

  try {
    const sentMessage = await sendChatMessage(chatId, { text: message.text });
    thread.messages = dedupeMessagesById(
      (thread.messages ?? []).map((m) =>
        m.id === localMessageId
          ? {
              ...m,
              id: sentMessage.id,
              deliveryState: undefined,
              profilePath: getCurrentUserProfilePath(),
            }
          : m,
      ),
    );
    removePendingOutgoing(chatId, localMessageId);
    chatsState.actionErrorMessage = "";
    updateThreadPreview(thread);
    sortThreadsByUpdatedAt();
    persistChatsData(chatsState.threads);
    refreshChatsPage(chatsRoot);
  } catch (error) {
    thread.messages = (thread.messages ?? []).map((m) =>
      m.id === localMessageId ? { ...m, deliveryState: "failed" } : m,
    );
    queueOutgoingForRetry(chatId, { ...message, deliveryState: "failed" });
    chatsState.actionErrorMessage = isOfflineNetworkError(error)
      ? "Нет соединения с интернетом."
      : error instanceof Error
        ? error.message
        : "Не получилось отправить сообщение.";
    keepSelectedChatPinnedToBottom();
    persistChatsData(chatsState.threads);
    refreshChatsPage(chatsRoot);
    scheduleScrollChatToBottom(chatsRoot);
  }
}
