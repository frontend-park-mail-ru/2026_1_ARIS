import { getSessionUser } from "../../state/session";

type ChatContactHint = {
  chatId: string;
  profileId?: string;
  title?: string;
  avatarLink?: string;
};

const CHAT_CONTACT_HINTS_KEY_PREFIX = "arisfront:chat-contact-hints";

function getChatContactHintsStorageKey(): string {
  const currentUserId = String(getSessionUser()?.id ?? "guest");
  return `${CHAT_CONTACT_HINTS_KEY_PREFIX}:${currentUserId}`;
}

function readChatContactHints(): Record<string, ChatContactHint> {
  try {
    const raw = sessionStorage.getItem(getChatContactHintsStorageKey());
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, ChatContactHint>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeChatContactHints(hints: Record<string, ChatContactHint>): void {
  try {
    sessionStorage.setItem(getChatContactHintsStorageKey(), JSON.stringify(hints));
  } catch {
    // Игнорируем ошибки хранилища, чтобы чат оставался рабочим.
  }
}

export function rememberChatContactHint(hint: ChatContactHint): void {
  const chatId = String(hint.chatId ?? "").trim();
  if (!chatId) return;

  const currentHints = readChatContactHints();
  const existingHint = currentHints[chatId] ?? { chatId };

  currentHints[chatId] = {
    chatId,
    profileId: hint.profileId ?? existingHint.profileId,
    title: hint.title ?? existingHint.title,
    avatarLink: hint.avatarLink ?? existingHint.avatarLink,
  };

  writeChatContactHints(currentHints);
}

export function getChatContactHint(chatId: string): ChatContactHint | null {
  const normalisedChatId = String(chatId ?? "").trim();
  if (!normalisedChatId) return null;

  const hints = readChatContactHints();
  return hints[normalisedChatId] ?? null;
}
