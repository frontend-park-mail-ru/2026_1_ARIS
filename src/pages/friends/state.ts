/**
 * Состояние страницы друзей.
 *
 * Содержит runtime-состояние, кэши и вспомогательные функции управления состоянием.
 */
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import { getProfileById } from "../../api/profile";
import { isNetworkUnavailableError } from "../../state/network-status";
import { StateManager } from "../../state/StateManager";
import { normaliseAvatarLink } from "../profile/state";
import type { DisplayFriend, FriendsData, FriendsState, FriendsTab } from "./types";

const FRIENDS_ACTIVE_TAB_STORAGE_KEY = "friends.activeTab";

/** Кэш уже определённых учебных подписей по profileId, чтобы не делать лишние API-запросы. */
export const friendEducationCache = new Map<string, string>();
export const friendAvatarCache = new Map<string, string>();

/**
 * Реактивное хранилище данных страницы друзей.
 */
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
 * Прокси над `friendsStore`: чтения возвращают актуальный снимок, записи вызывают `patch()`.
 * Позволяет использовать `friendsState.x = y` без изменений вызывающего кода.
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

/**
 * Преобразует ошибку загрузки друзей в сообщение для UI.
 *
 * @param {unknown} error Исходная ошибка.
 * @param {string} fallbackMessage Сообщение по умолчанию.
 * @param {string} [unavailableMessage="Нет соединения с сервером."] Сообщение для офлайн-сценария.
 * @returns {string} Текст ошибки для отображения пользователю.
 */
export function getFriendsErrorMessage(
  error: unknown,
  fallbackMessage: string,
  unavailableMessage = "Нет соединения с сервером.",
): string {
  if (isNetworkUnavailableError(error)) return unavailableMessage;
  return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Сбрасывает состояние страницы друзей к начальному виду.
 *
 * @returns {void}
 */
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

/**
 * Сохраняет активную вкладку в `sessionStorage`.
 *
 * @param {string} userId Идентификатор текущего пользователя.
 * @returns {void}
 */
export function persistFriendsActiveTab(userId: string): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(getFriendsActiveTabStorageKey(userId), friendsState.activeTab);
  } catch {
    // Игнорируем проблемы доступа к хранилищу.
  }
}

function getProfileAvatarLink(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return (
    normaliseAvatarLink(
      ("imageLink" in payload && typeof payload.imageLink === "string"
        ? payload.imageLink
        : "avatarLink" in payload && typeof payload.avatarLink === "string"
          ? payload.avatarLink
          : "avatarUrl" in payload && typeof payload.avatarUrl === "string"
            ? payload.avatarUrl
            : "avatar" in payload && typeof payload.avatar === "string"
              ? payload.avatar
              : "") || undefined,
    ) ?? ""
  );
}

export async function hydrateFriendAvatarLinks<T extends Friend>(
  friends: T[],
  signal?: AbortSignal,
): Promise<T[]> {
  return Promise.all(
    friends.map(async (friend) => {
      const cachedAvatarLink =
        friend.avatarLink?.trim() || friendAvatarCache.get(friend.profileId) || "";
      if (cachedAvatarLink) {
        if (!friendAvatarCache.has(friend.profileId)) {
          friendAvatarCache.set(friend.profileId, cachedAvatarLink);
        }
        return cachedAvatarLink === friend.avatarLink
          ? friend
          : { ...friend, avatarLink: cachedAvatarLink };
      }

      try {
        const profile = await getProfileById(friend.profileId, signal);
        const avatarLink = getProfileAvatarLink(profile);

        if (!avatarLink) {
          return friend;
        }

        friendAvatarCache.set(friend.profileId, avatarLink);
        return { ...friend, avatarLink };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }

        return friend;
      }
    }),
  );
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
    // Переходим к резервному варианту с логином пользователя.
  }

  const fallback = friend.username ? `@${friend.username}` : "Пользователь ARIS";
  friendEducationCache.set(friend.profileId, fallback);
  return fallback;
}

async function mapFriendToDisplay(friend: Friend): Promise<DisplayFriend> {
  return { ...friend, educationLabel: await resolveFriendEducationLabel(friend) };
}

/**
 * Обогащает карточки друзей отсутствующими ссылками на аватары, даже если сами списки
 * уже были загружены и находятся в памяти.
 */
export async function hydrateDisplayFriendAvatarLinks(
  lists: Pick<FriendsData, "friends" | "incoming" | "outgoing">,
  signal?: AbortSignal,
): Promise<FriendsData> {
  const [friends, incoming, outgoing] = await Promise.all([
    hydrateFriendAvatarLinks(lists.friends, signal),
    hydrateFriendAvatarLinks(lists.incoming, signal),
    hydrateFriendAvatarLinks(lists.outgoing, signal),
  ]);

  return { friends, incoming, outgoing };
}

/**
 * Параллельно загружает друзей и заявки с сервера.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<FriendsData>} Наборы друзей для всех вкладок.
 */
export async function loadFriendsFromBackend(signal?: AbortSignal): Promise<FriendsData> {
  const [friends, incoming, outgoing] = await Promise.all([
    getFriends("accepted", signal),
    getIncomingFriendRequests("pending", signal),
    getOutgoingFriendRequests("pending", signal),
  ]);

  const [hydratedFriends, hydratedIncoming, hydratedOutgoing] = await Promise.all([
    hydrateFriendAvatarLinks(friends, signal),
    hydrateFriendAvatarLinks(incoming, signal),
    hydrateFriendAvatarLinks(outgoing, signal),
  ]);

  const [mappedFriends, mappedIncoming, mappedOutgoing] = await Promise.all([
    Promise.all(hydratedFriends.map(mapFriendToDisplay)),
    Promise.all(hydratedIncoming.map(mapFriendToDisplay)),
    Promise.all(hydratedOutgoing.map(mapFriendToDisplay)),
  ]);

  return { friends: mappedFriends, incoming: mappedIncoming, outgoing: mappedOutgoing };
}

/**
 * Загружает данные страницы друзей.
 *
 * Без `force` повторный запрос не делается, если данные уже есть:
 * это защищает интерфейс от лишних сетевых скачков между вкладками.
 *
 * @param {boolean} [force=false] Игнорировать ли локальный флаг `loaded`.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<void>}
 */
export async function ensureFriendsLoaded(force = false, signal?: AbortSignal): Promise<void> {
  if ((!force && friendsState.loading) || (!force && friendsState.loaded)) return;

  friendsState.loading = true;
  friendsState.errorMessage = "";

  try {
    const data = await loadFriendsFromBackend(signal);
    friendsState.friends = data.friends;
    friendsState.incoming = data.incoming;
    friendsState.outgoing = data.outgoing;
    friendsState.loaded = true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    friendsState.errorMessage = getFriendsErrorMessage(error, "Не удалось загрузить друзей.");
    friendsState.friends = [];
    friendsState.incoming = [];
    friendsState.outgoing = [];
    friendsState.loaded = false;
  } finally {
    friendsState.loading = false;
  }
}

/**
 * Ищет пользователя в любом списке страницы друзей.
 *
 * @param {string} friendId Идентификатор профиля.
 * @returns {DisplayFriend | null} Найденный пользователь или `null`.
 */
export function findFriendById(friendId: string): DisplayFriend | null {
  return (
    friendsState.friends.find((f) => f.profileId === friendId) ??
    friendsState.incoming.find((f) => f.profileId === friendId) ??
    friendsState.outgoing.find((f) => f.profileId === friendId) ??
    null
  );
}

/**
 * Возвращает список друзей для текущей вкладки и строки поиска.
 *
 * @returns {DisplayFriend[]} Отфильтрованный набор карточек друзей.
 */
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
