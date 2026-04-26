import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import { getProfileById } from "../../api/profile";
import { isNetworkUnavailableError } from "../../state/network-status";
import { StateManager } from "../../state/StateManager";
import type { DisplayFriend, FriendsData, FriendsState, FriendsTab } from "./types";

const FRIENDS_ACTIVE_TAB_STORAGE_KEY = "friends.activeTab";

/** Кэш уже определённых учебных подписей по profileId, чтобы не делать лишние API-запросы. */
export const friendEducationCache = new Map<string, string>();

export const friendsStore = new StateManager<FriendsState>({
  loaded: false,
  loadedForUserId: "",
  loading: false,
  errorMessage: "",
  query: "",
  activeTab: "accepted",
  friends: [],
  incoming: [],
  outgoing: [],
  deleteModalFriend: null,
});

/**
 * Прокси над friendsStore: чтения возвращают актуальный снимок, записи вызывают patch().
 * Позволяет использовать friendsState.x = y везде без изменения вызывающего кода.
 */
export const friendsState = new Proxy({} as FriendsState, {
  get(_target, prop: string) {
    return (friendsStore.get() as Record<string, unknown>)[prop];
  },
  set(_target, prop: string, value: unknown) {
    friendsStore.patch({ [prop]: value } as Partial<FriendsState>);
    return true;
  },
});

export function getFriendsErrorMessage(
  error: unknown,
  fallbackMessage: string,
  unavailableMessage = "Нет соединения с сервером.",
): string {
  if (isNetworkUnavailableError(error)) return unavailableMessage;
  return error instanceof Error ? error.message : fallbackMessage;
}

export function resetFriendsState(): void {
  friendsState.loaded = false;
  friendsState.loading = false;
  friendsState.errorMessage = "";
  friendsState.query = "";
  friendsState.activeTab = "accepted";
  friendsState.friends = [];
  friendsState.incoming = [];
  friendsState.outgoing = [];
  friendsState.deleteModalFriend = null;
}

function isFriendsTab(value: string | null): value is FriendsTab {
  return value === "accepted" || value === "incoming" || value === "outgoing";
}

function getFriendsActiveTabStorageKey(userId: string): string {
  return `${FRIENDS_ACTIVE_TAB_STORAGE_KEY}:${userId}`;
}

/** Восстанавливает активную вкладку из sessionStorage для указанного пользователя. */
export function restoreFriendsActiveTab(userId: string): void {
  if (!userId) return;
  try {
    const savedTab = sessionStorage.getItem(getFriendsActiveTabStorageKey(userId));
    if (isFriendsTab(savedTab)) friendsState.activeTab = savedTab;
  } catch {
    // Игнорируем проблемы доступа к хранилищу.
  }
}

/** Сохраняет текущую активную вкладку в sessionStorage. */
export function persistFriendsActiveTab(userId: string): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(getFriendsActiveTabStorageKey(userId), friendsState.activeTab);
  } catch {
    // Игнорируем проблемы доступа к хранилищу.
  }
}

async function resolveFriendEducationLabel(friend: Friend): Promise<string> {
  const cached = friendEducationCache.get(friend.profileId);
  if (cached) return cached;

  try {
    const profile = await getProfileById(friend.profileId);
    const institution = profile.education
      ?.find((item) => item.institution?.trim())
      ?.institution?.trim();

    if (institution) {
      friendEducationCache.set(friend.profileId, institution);
      return institution;
    }
  } catch {
    // Переходим к резервному варианту с username.
  }

  const fallback = friend.username ? `@${friend.username}` : "Пользователь ARIS";
  friendEducationCache.set(friend.profileId, fallback);
  return fallback;
}

async function mapFriendToDisplay(friend: Friend): Promise<DisplayFriend> {
  return { ...friend, educationLabel: await resolveFriendEducationLabel(friend) };
}

/** Параллельно загружает друзей, входящие и исходящие заявки из backend. */
export async function loadFriendsFromBackend(): Promise<FriendsData> {
  const [friends, incoming, outgoing] = await Promise.all([
    getFriends("accepted"),
    getIncomingFriendRequests("pending"),
    getOutgoingFriendRequests("pending"),
  ]);

  const [mappedFriends, mappedIncoming, mappedOutgoing] = await Promise.all([
    Promise.all(friends.map(mapFriendToDisplay)),
    Promise.all(incoming.map(mapFriendToDisplay)),
    Promise.all(outgoing.map(mapFriendToDisplay)),
  ]);

  return { friends: mappedFriends, incoming: mappedIncoming, outgoing: mappedOutgoing };
}

/** Загружает данные друзей, если они ещё не загружены, либо принудительно. */
export async function ensureFriendsLoaded(force = false): Promise<void> {
  if ((!force && friendsState.loading) || (!force && friendsState.loaded)) return;

  friendsState.loading = true;
  friendsState.errorMessage = "";

  try {
    const data = await loadFriendsFromBackend();
    friendsState.friends = data.friends;
    friendsState.incoming = data.incoming;
    friendsState.outgoing = data.outgoing;
    friendsState.loaded = true;
  } catch (error) {
    friendsState.errorMessage = getFriendsErrorMessage(error, "Не удалось загрузить друзей.");
    friendsState.friends = [];
    friendsState.incoming = [];
    friendsState.outgoing = [];
    friendsState.loaded = false;
  } finally {
    friendsState.loading = false;
  }
}

/** Ищет друга по profileId в любом из трёх списков. */
export function findFriendById(friendId: string): DisplayFriend | null {
  return (
    friendsState.friends.find((f) => f.profileId === friendId) ??
    friendsState.incoming.find((f) => f.profileId === friendId) ??
    friendsState.outgoing.find((f) => f.profileId === friendId) ??
    null
  );
}

/** Возвращает список друзей, видимых в текущей вкладке с учётом поискового запроса. */
export function getVisibleFriends(): DisplayFriend[] {
  const source =
    friendsState.activeTab === "accepted"
      ? friendsState.friends
      : friendsState.activeTab === "incoming"
        ? friendsState.incoming
        : friendsState.outgoing;

  const query = friendsState.query.trim().toLowerCase();
  if (!query) return source;

  return source.filter((friend) =>
    [friend.firstName, friend.lastName, friend.username, friend.educationLabel]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}
