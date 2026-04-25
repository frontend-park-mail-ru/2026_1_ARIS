import { getSessionUser } from "../../state/session";
import { chatsState } from "./state";
import { sortMessagesByCreatedAt } from "./helpers";
import type {
  ChatViewMessage,
  ChatViewThread,
  PersistedChatsData,
  PersistedChatsUiState,
} from "./types";

function getChatsUiStorageKey(): string {
  const currentUserId = String(getSessionUser()?.id ?? chatsState.loadedForUserId ?? "");
  return `arisfront:chats-ui:${currentUserId || "guest"}`;
}

function getChatsDataStorageKey(): string {
  const currentUserId = String(getSessionUser()?.id ?? chatsState.loadedForUserId ?? "");
  return `arisfront:chats-data:${currentUserId || "guest"}`;
}

/** Читает сохранённое состояние UI (выбранный чат, позиции прокрутки) из sessionStorage. */
export function readPersistedChatsUiState(): PersistedChatsUiState | null {
  try {
    const raw = sessionStorage.getItem(getChatsUiStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChatsUiState;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Сохраняет текущее состояние UI (выбранный чат, позиции прокрутки) в sessionStorage. */
export function persistChatsUiState(
  selectedChatId: string,
  scrollStateByChatId: Map<string, { scrollTop: number; pinnedToBottom: boolean }>,
): void {
  try {
    const payload: PersistedChatsUiState = {
      selectedChatId,
      scrollStateByChatId: Object.fromEntries(scrollStateByChatId.entries()),
    };
    sessionStorage.setItem(getChatsUiStorageKey(), JSON.stringify(payload));
  } catch {
    // Игнорируем ошибки хранилища, чтобы чат оставался рабочим.
  }
}

function sanitisePersistedMessage(value: unknown): ChatViewMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<ChatViewMessage>;
  const id = String(message.id ?? "");
  const authorName = String(message.authorName ?? "");
  if (!id || !authorName) return null;

  return {
    id,
    text: String(message.text ?? ""),
    authorName,
    isOwn: Boolean(message.isOwn),
    deliveryState: message.deliveryState === "sending" ? "failed" : message.deliveryState,
    createdAt: typeof message.createdAt === "string" ? message.createdAt : undefined,
    avatarLink: typeof message.avatarLink === "string" ? message.avatarLink : undefined,
    profilePath: typeof message.profilePath === "string" ? message.profilePath : undefined,
  };
}

function sanitisePersistedThread(value: unknown): ChatViewThread | null {
  if (!value || typeof value !== "object") return null;
  const thread = value as Partial<ChatViewThread>;
  const id = String(thread.id ?? "");
  const title = String(thread.title ?? "");
  if (!id || !title) return null;

  const messages = Array.isArray(thread.messages)
    ? sortMessagesByCreatedAt(
        thread.messages
          .map((m) => sanitisePersistedMessage(m))
          .filter((m): m is ChatViewMessage => Boolean(m)),
      )
    : undefined;

  return {
    id,
    title,
    profileId: typeof thread.profileId === "string" ? thread.profileId : undefined,
    isFriend: Boolean(thread.isFriend),
    avatarLink: typeof thread.avatarLink === "string" ? thread.avatarLink : undefined,
    preview: String(thread.preview ?? ""),
    previewIsOwn: Boolean(thread.previewIsOwn),
    timeLabel: String(thread.timeLabel ?? ""),
    createdAt: typeof thread.createdAt === "string" ? thread.createdAt : undefined,
    updatedAt: typeof thread.updatedAt === "string" ? thread.updatedAt : undefined,
    source: "api",
    messages,
    profilePath: typeof thread.profilePath === "string" ? thread.profilePath : undefined,
  };
}

/** Читает сохранённые треды чатов из localStorage для офлайн-режима. */
export function readPersistedChatsData(): ChatViewThread[] {
  try {
    const raw = localStorage.getItem(getChatsDataStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedChatsData | ChatViewThread[];
    const threads = Array.isArray(parsed) ? parsed : parsed?.threads;
    if (!Array.isArray(threads)) return [];
    return threads
      .map((t) => sanitisePersistedThread(t))
      .filter((t): t is ChatViewThread => Boolean(t));
  } catch {
    return [];
  }
}

/** Сохраняет текущие треды чатов из API в localStorage. */
export function persistChatsData(threads: ChatViewThread[]): void {
  try {
    const apiThreads = threads
      .filter((t) => t.source === "api")
      .map((t) => ({ ...t, source: "api" as const }));
    localStorage.setItem(getChatsDataStorageKey(), JSON.stringify({ threads: apiThreads }));
  } catch {
    // Игнорируем ошибки хранилища, чтобы чат оставался рабочим.
  }
}
