/**
 * Persisted-хранилище состояния страницы чатов.
 */
import { getSessionUser } from "../../state/session";
import { chatsState } from "./state";
import { sortMessagesByCreatedAt } from "./helpers";
import type {
  ChatVideoNoteAttachment,
  ChatViewMessage,
  ChatViewThread,
  ChatVoiceAttachment,
  PersistedChatsData,
  PersistedChatsUiState,
} from "./types";

const LEGACY_WEBM_ATTACHMENT_RE = /\.webm(?:[?#].*)?$/i;

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
  const media = Array.isArray(message.media) ? message.media : [];
  const files = Array.isArray(message.files) ? message.files : [];

  let voice: ChatVoiceAttachment | undefined;
  if (message.voice && typeof message.voice === "object") {
    const rawVoice = message.voice as Partial<ChatVoiceAttachment>;
    const voiceUrl = typeof rawVoice.url === "string" ? rawVoice.url : "";
    const waveform = Array.isArray(rawVoice.waveform)
      ? rawVoice.waveform
          .map((height) => Number(height))
          .filter((height) => Number.isFinite(height) && height > 0)
      : undefined;
    if (voiceUrl && !voiceUrl.startsWith("blob:")) {
      voice = {
        url: voiceUrl,
        mimeType: String(rawVoice.mimeType ?? "audio/mpeg"),
        mediaID: typeof rawVoice.mediaID === "number" ? rawVoice.mediaID : undefined,
        durationMs: typeof rawVoice.durationMs === "number" ? rawVoice.durationMs : undefined,
        waveform: waveform?.length ? waveform : undefined,
      };
    }
  }

  let videoNote: ChatVideoNoteAttachment | undefined;
  if (message.videoNote && typeof message.videoNote === "object") {
    const rawVideoNote = message.videoNote as Partial<ChatVideoNoteAttachment>;
    const videoNoteUrl = typeof rawVideoNote.url === "string" ? rawVideoNote.url : "";
    if (videoNoteUrl && !videoNoteUrl.startsWith("blob:")) {
      videoNote = {
        url: videoNoteUrl,
        mimeType: String(rawVideoNote.mimeType ?? "video/webm"),
        mediaID: typeof rawVideoNote.mediaID === "number" ? rawVideoNote.mediaID : undefined,
      };
    }
  }

  if (!voice && !videoNote && !String(message.text ?? "").trim()) {
    const attachments = [...media, ...files];
    const legacyWebm = attachments.length === 1 ? attachments[0] : undefined;
    const legacyMimeType = String(legacyWebm?.mimeType ?? "")
      .trim()
      .toLowerCase();
    const isLegacyWebm =
      legacyWebm &&
      (legacyMimeType === "video/webm" || legacyMimeType.startsWith("video/webm;")) &&
      (LEGACY_WEBM_ATTACHMENT_RE.test(legacyWebm.url) ||
        LEGACY_WEBM_ATTACHMENT_RE.test(legacyWebm.name ?? ""));

    if (legacyWebm && isLegacyWebm) {
      voice = {
        url: legacyWebm.url,
        mimeType: "audio/webm",
        mediaID: Number.isFinite(Number(legacyWebm.id)) ? Number(legacyWebm.id) : undefined,
      };
    }
  }

  return {
    id,
    text: String(message.text ?? ""),
    stickerId: typeof message.stickerId === "string" ? message.stickerId : undefined,
    stickerData:
      message.stickerData && typeof message.stickerData === "object"
        ? message.stickerData
        : undefined,
    media,
    files,
    authorName,
    isOwn: Boolean(message.isOwn),
    deliveryState: message.deliveryState === "sending" ? "failed" : message.deliveryState,
    createdAt: typeof message.createdAt === "string" ? message.createdAt : undefined,
    avatarLink: typeof message.avatarLink === "string" ? message.avatarLink : undefined,
    profilePath: typeof message.profilePath === "string" ? message.profilePath : undefined,
    voice,
    videoNote,
  };
}

function sanitisePersistedThread(value: unknown): ChatViewThread | null {
  if (!value || typeof value !== "object") return null;
  const thread = value as Partial<ChatViewThread>;
  const id = String(thread.id ?? "");
  const title = String(thread.title ?? "");
  if (!id || !title) return null;
  const interlocutorProfileId =
    typeof thread.interlocutorProfileId === "string" ? thread.interlocutorProfileId : undefined;

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
    profileId: interlocutorProfileId,
    interlocutorProfileId,
    interlocutorUserAccountId:
      typeof thread.interlocutorUserAccountId === "string"
        ? thread.interlocutorUserAccountId
        : undefined,
    isFriend: Boolean(thread.isFriend),
    avatarLink: typeof thread.avatarLink === "string" ? thread.avatarLink : undefined,
    isOnline: false,
    lastSeenAt: typeof thread.lastSeenAt === "string" ? thread.lastSeenAt : undefined,
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
