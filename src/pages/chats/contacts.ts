import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import {
  getLatestEvents,
  getPublicPopularUsers,
  getSuggestedUsers,
  type LatestEventUser,
  type SuggestedUser,
} from "../../api/users";
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

export function rememberKnownUserContacts(users: Array<SuggestedUser | LatestEventUser>): void {
  users.forEach((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    if (!fullName) return;
    knownChatContactsByName.set(getNormalisedPersonName(fullName), {
      profileId: user.id,
      avatarLink: user.avatarLink || undefined,
    });
  });
}

/** Загружает все доступные контакты (друзья + рекомендованные пользователи) в кэши. Если уже загружено, ничего не делает. */
export async function ensureKnownChatContactsLoaded(): Promise<void> {
  if (knownChatContactsByName.size > 0) return;

  try {
    const [accepted, incoming, outgoing, suggested, latestEvents, popularUsers] = await Promise.all(
      [
        getFriends("accepted"),
        getIncomingFriendRequests("pending"),
        getOutgoingFriendRequests("pending"),
        getSuggestedUsers(),
        getLatestEvents(),
        getPublicPopularUsers(),
      ],
    );

    rememberKnownChatContacts(accepted);
    rememberKnownChatContacts(incoming);
    rememberKnownChatContacts(outgoing);
    rememberKnownUserContacts(suggested.items ?? []);
    rememberKnownUserContacts(latestEvents.items ?? []);
    rememberKnownUserContacts(popularUsers.items ?? []);
  } catch (error) {
    console.info("[chats] source=api scope=contacts error", {
      error: error instanceof Error ? error.message : "Не получилось загрузить контакты.",
    });
  }
}
