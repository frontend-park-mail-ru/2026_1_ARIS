import { getProfileRecordById } from "../profile/profile-data";
import type { ChatSummary } from "../../api/chat";
import {
  formatChatTime,
  formatChatExactTime,
  formatMessageTime,
  getNormalisedPersonName,
  looksLikeDirectPersonName,
  resolvePersonPath,
} from "./helpers";
import { knownChatContactsByName, acceptedFriendProfileIds } from "./contacts";
import { chatsState } from "./state";
import type { ChatViewThread } from "./types";

/** Обновляет поля preview, timeLabel и updatedAt по последнему сообщению. */
export function updateThreadPreview(thread: ChatViewThread): void {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;

  thread.preview = lastMessage.text;
  thread.previewIsOwn = lastMessage.isOwn;
  thread.timeLabel = formatMessageTime(lastMessage.createdAt);
  thread.updatedAt = lastMessage.createdAt ?? thread.updatedAt;
}

/** Синхронизирует profilePath треда по первому не-своему сообщению, у которого он есть. */
export function syncThreadProfilePathFromMessages(thread: ChatViewThread): void {
  const otherMessage = (thread.messages ?? []).find(
    (m) => !m.isOwn && m.profilePath && m.profilePath !== "/profile",
  );
  if (otherMessage?.profilePath) {
    thread.profilePath = otherMessage.profilePath;
  }
}

function getThreadUpdatedAtValue(thread: ChatViewThread): number {
  if (!thread.updatedAt) return 0;
  const parsed = new Date(thread.updatedAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getThreadCreatedAtValue(thread: ChatViewThread): number {
  if (!thread.createdAt) return 0;
  const parsed = new Date(thread.createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasThreadActivity(thread: ChatViewThread): boolean {
  if ((thread.messages?.length ?? 0) > 0) return true;
  if (thread.preview.trim()) return true;
  return getThreadUpdatedAtValue(thread) > getThreadCreatedAtValue(thread);
}

/** Сортирует треды на месте: сначала с активностью, затем по updatedAt по убыванию. */
export function sortThreadsByUpdatedAt(): void {
  chatsState.threads.sort((left, right) => {
    const leftHasActivity = hasThreadActivity(left);
    const rightHasActivity = hasThreadActivity(right);
    if (leftHasActivity !== rightHasActivity) return leftHasActivity ? -1 : 1;
    return getThreadUpdatedAtValue(right) - getThreadUpdatedAtValue(left);
  });
}

function getThreadCounterpartyName(thread: ChatViewThread): string {
  const otherMessage = (thread.messages ?? []).find((m) => !m.isOwn && m.authorName.trim());
  return otherMessage?.authorName?.trim() || thread.title.trim();
}

/** Возвращает true, если тред нужно показывать (личный чат между пользователями). */
export function isEligibleDirectThread(thread: ChatViewThread): boolean {
  if (thread.isFriend) return true;
  if ((thread.messages?.length ?? 0) === 0) return false;
  return looksLikeDirectPersonName(getThreadCounterpartyName(thread));
}

/** Фильтрует `chatsState.threads`, оставляя только подходящие треды, и заново выбирает чат. */
export function applyThreadVisibilityRules(preferredChatId = ""): void {
  const previousSelectedChatId = chatsState.selectedChatId;
  chatsState.threads = chatsState.threads.filter(isEligibleDirectThread);
  sortThreadsByUpdatedAt();
  chatsState.selectedChatId =
    chatsState.threads.find((t) => t.id === preferredChatId)?.id ??
    chatsState.threads.find((t) => t.id === previousSelectedChatId)?.id ??
    chatsState.threads[0]?.id ??
    "";
}

/** Преобразует сырые краткие данные чатов из API в объекты ChatViewThread с использованием данных известных контактов. */
export function mapApiChatsToThreads(chats: ChatSummary[]): ChatViewThread[] {
  return [...chats]
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
      return rightTime - leftTime;
    })
    .map((chat, index) => {
      const knownContact = knownChatContactsByName.get(getNormalisedPersonName(chat.title || ""));
      const matchedProfile = knownContact?.profileId
        ? getProfileRecordById(String(knownContact.profileId))
        : undefined;
      const profileId = knownContact?.profileId;

      return {
        id: chat.id,
        title: chat.title || `Чат ${index + 1}`,
        profileId,
        isFriend: profileId ? acceptedFriendProfileIds.has(String(profileId)) : false,
        avatarLink: chat.avatarLink ?? knownContact?.avatarLink ?? matchedProfile?.avatarLink,
        preview: "",
        previewIsOwn: false,
        timeLabel: formatChatTime(chat.updatedAt ?? chat.createdAt),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt ?? chat.createdAt,
        source: "api" as const,
        profilePath: profileId
          ? resolvePersonPath(chat.title || `Чат ${index + 1}`, profileId)
          : "/profile",
      };
    });
}

/** Объединяет пришедшие из API треды с текущим состоянием, сохраняя сообщения и состояние прокрутки. */
export function mergeApiThreads(nextThreads: ChatViewThread[]): boolean {
  const previousSignature = chatsState.threads.map((t) => t.id).join("|");
  const existingById = new Map(chatsState.threads.map((t) => [t.id, t]));
  const previousSelectedChatId = chatsState.selectedChatId;

  chatsState.threads = nextThreads.map((thread) => {
    const existing = existingById.get(thread.id);
    const merged: ChatViewThread = {
      ...thread,
      messages: existing?.messages,
      preview: existing?.preview ?? thread.preview,
      previewIsOwn: existing?.previewIsOwn ?? thread.previewIsOwn,
      timeLabel: existing?.messages?.length ? existing.timeLabel : thread.timeLabel,
      createdAt: existing?.createdAt ?? thread.createdAt,
      updatedAt: existing?.updatedAt ?? thread.updatedAt,
      profileId: thread.profileId ?? existing?.profileId,
      isFriend: thread.isFriend ?? existing?.isFriend,
      profilePath: thread.profilePath ?? existing?.profilePath,
    };

    if (merged.messages?.length) {
      syncThreadProfilePathFromMessages(merged);
      updateThreadPreview(merged);
    }

    return merged;
  });

  sortThreadsByUpdatedAt();
  chatsState.selectedChatId =
    chatsState.threads.find((t) => t.id === previousSelectedChatId)?.id ??
    chatsState.threads[0]?.id ??
    "";

  return previousSignature !== chatsState.threads.map((t) => t.id).join("|");
}

/** Возвращает треды, отфильтрованные по текущему поисковому запросу. */
export function getFilteredThreads(): ChatViewThread[] {
  const query = chatsState.query.trim().toLowerCase();
  if (!query) return chatsState.threads;
  return chatsState.threads.filter((thread) => {
    const lastMessage = thread.messages?.[thread.messages.length - 1];
    const preview = lastMessage?.text ?? thread.preview;
    return [thread.title, preview].join(" ").toLowerCase().includes(query);
  });
}

/** Возвращает текущий выбранный тред из списка отфильтрованных тредов. */
export function getSelectedThread(filteredThreads: ChatViewThread[]): ChatViewThread | undefined {
  return filteredThreads.find((t) => t.id === chatsState.selectedChatId) ?? filteredThreads[0];
}

/** Возвращает состояние превью (text, isOwn, timeLabel), вычисленное по последнему сообщению или резервным данным. */
export function getThreadPreviewState(thread: ChatViewThread): {
  text: string;
  isOwn: boolean;
  timeLabel: string;
  timeTooltip: string;
} {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {
      text: thread.preview,
      isOwn: Boolean(thread.previewIsOwn),
      timeLabel: thread.preview.trim() ? thread.timeLabel : "",
      timeTooltip: thread.updatedAt ? formatChatExactTime(thread.updatedAt) : "",
    };
  }

  return {
    text: lastMessage.text,
    isOwn: lastMessage.isOwn,
    timeLabel: formatChatTime(lastMessage.createdAt) || thread.timeLabel,
    timeTooltip: formatChatExactTime(lastMessage.createdAt),
  };
}
