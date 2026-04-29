/**
 * Кэши известных контактов для страницы чатов.
 *
 * Нужны, чтобы:
 * - быстрее сопоставлять имена диалогов с профилями
 * - подтягивать аватар и profileId для пустых чатов
 * - различать друзей и недрузей в правилах видимости тредов
 */
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import { getNormalisedPersonName } from "./helpers";
import type { KnownChatContact } from "./types";

/** Карта из нормализованного имени в метаданные известного контакта. */
export const knownChatContactsByName = new Map<string, KnownChatContact>();

/** Множество profileId пользователей, которые являются подтверждёнными друзьями текущего пользователя. */
export const acceptedFriendProfileIds = new Set<string>();

/**
 * Очищает локальные кэши известных контактов.
 *
 * @returns {void}
 */
export function clearKnownContacts(): void {
  knownChatContactsByName.clear();
  acceptedFriendProfileIds.clear();
}

/**
 * Запоминает список контактов в локальных кэшах страницы чатов.
 *
 * @param {Friend[]} friends Пользователи, которых нужно сохранить.
 * @returns {void}
 */
export function rememberKnownChatContacts(friends: Friend[]): void {
  friends.forEach((friend) => {
    const fullName = `${friend.firstName} ${friend.lastName}`.trim();
    if (!fullName) return;

    knownChatContactsByName.set(getNormalisedPersonName(fullName), {
      profileId: friend.profileId,
      avatarLink: friend.avatarLink,
    });

    if (friend.status === "accepted" && friend.profileId) {
      acceptedFriendProfileIds.add(String(friend.profileId));
    }
  });
}

/**
 * Загружает контакты в локальные кэши страницы чатов.
 *
 * Если кэш уже заполнен, повторной загрузки не будет: это снижает шум
 * при частых фоновых обновлениях списка диалогов.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<void>}
 */
export async function ensureKnownChatContactsLoaded(signal?: AbortSignal): Promise<void> {
  if (knownChatContactsByName.size > 0) return;

  try {
    const [accepted, incoming, outgoing] = await Promise.all([
      getFriends("accepted", signal),
      getIncomingFriendRequests("pending", signal),
      getOutgoingFriendRequests("pending", signal),
    ]);

    rememberKnownChatContacts(accepted);
    rememberKnownChatContacts(incoming);
    rememberKnownChatContacts(outgoing);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    console.info("[chats] source=api scope=contacts error", {
      error: error instanceof Error ? error.message : "Не получилось загрузить контакты.",
    });
  }
}
