import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import { getNormalisedPersonName } from "./helpers";
import type { KnownChatContact } from "./types";

/** Карта из нормализованного полного имени в avatar/profileId для известных контактов. */
export const knownChatContactsByName = new Map<string, KnownChatContact>();

/** Множество profileId пользователей, которые являются подтверждёнными друзьями текущего пользователя. */
export const acceptedFriendProfileIds = new Set<string>();

/** Очищает все кэши известных контактов. */
export function clearKnownContacts(): void {
  knownChatContactsByName.clear();
  acceptedFriendProfileIds.clear();
}

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

/** Загружает все доступные контакты (друзья + рекомендованные пользователи) в кэши. Если уже загружено, ничего не делает. */
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
