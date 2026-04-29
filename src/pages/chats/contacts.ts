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
import { getProfileById } from "../../api/profile";
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
async function resolveFriendAvatarLink(
  friend: Friend,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    const profile = await getProfileById(friend.profileId, signal);
    const profileAvatarLink = profile.imageLink?.trim();
    return profileAvatarLink || friend.avatarLink;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    return friend.avatarLink;
  }
}

export async function rememberKnownChatContacts(
  friends: Friend[],
  signal?: AbortSignal,
): Promise<void> {
  await Promise.all(
    friends.map(async (friend) => {
      const avatarLink = await resolveFriendAvatarLink(friend, signal);
      const fullName = `${friend.firstName} ${friend.lastName}`.trim();
      if (!fullName) return;

      knownChatContactsByName.set(getNormalisedPersonName(fullName), {
        profileId: friend.profileId,
        avatarLink,
      });

      if (friend.status === "accepted" && friend.profileId) {
        acceptedFriendProfileIds.add(String(friend.profileId));
      }
    }),
  );
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

    await rememberKnownChatContacts(accepted, signal);
    await rememberKnownChatContacts(incoming, signal);
    await rememberKnownChatContacts(outgoing, signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    console.info("[chats] source=api scope=contacts error", {
      error: error instanceof Error ? error.message : "Не получилось загрузить контакты.",
    });
  }
}
