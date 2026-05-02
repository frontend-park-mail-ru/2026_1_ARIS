/**
 * Модуль слоя API.
 *
 * Содержит клиентские запросы и нормализацию данных для интерфейса.
 */
/**
 * API для работы с друзьями и заявками в друзья.
 *
 * Содержит:
 * - загрузку списков друзей и заявок;
 * - отправку, принятие, отклонение и отзыв заявок;
 * - удаление из друзей.
 */
import { ApiError, apiRequest } from "./core/client";

// Повторно экспортируем `ApiError`, чтобы сохранить текущие импорты в других модулях.
export { ApiError };

/**
 * Сырой объект пользователя в ответах API по друзьям.
 */
type RawFriend = {
  avatarID?: number | null;
  avatarLink?: string | null;
  avatarUrl?: string | null;
  imageLink?: string | null;
  avatar?: string | null;
  id?: number | string;
  profileID?: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  login?: string;
  status?: string;
  link?: string | null;
  createdAt?: string;
};

/**
 * Сырой ответ API со списком друзей или заявок.
 */
type RawFriendsResponse = {
  friends?: RawFriend[];
};

/**
 * Статус дружбы в клиентском коде.
 */
export type FriendStatus = "pending" | "accepted";

/**
 * Пользователь в списке друзей или заявок.
 */
export type Friend = {
  /** Идентификатор профиля. */
  profileId: string;
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Логин пользователя. */
  username: string;
  /** Текущий статус дружбы. */
  status: FriendStatus;
  /** Ссылка на аватар пользователя. */
  avatarLink?: string | undefined;
  /** Дата создания дружбы или заявки в формате ISO. */
  createdAt?: string | undefined;
};

function mapFriend(raw: RawFriend): Friend {
  const status = raw.status === "accepted" ? "accepted" : "pending";
  const avatarLink = String(
    raw.avatarLink ?? raw.link ?? raw.avatarUrl ?? raw.imageLink ?? raw.avatar ?? "",
  ).trim();

  return {
    profileId: String(raw.id ?? raw.profileID ?? ""),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    username: String(raw.username ?? raw.login ?? ""),
    status,
    avatarLink: avatarLink || undefined,
    createdAt: raw.createdAt ?? undefined,
  };
}

async function requestFriends(path: string, signal?: AbortSignal): Promise<Friend[]> {
  const data = await apiRequest<RawFriendsResponse>(path, { ...(signal ? { signal } : {}) }, {});

  if (!Array.isArray(data.friends)) {
    return [];
  }

  return data.friends.map(mapFriend).filter((friend) => Boolean(friend.profileId));
}

async function mutateFriendship(
  path: string,
  method: "DELETE" | "POST",
  payload?: unknown,
): Promise<void> {
  await apiRequest<unknown>(path, { method, body: payload }, {});
}

/**
 * Загружает список друзей текущего пользователя по статусу.
 *
 * @param {FriendStatus} [status=\"accepted\"] Нужный статус дружбы.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<Friend[]>} Нормализованный список друзей или заявок.
 * @example
 * const acceptedFriends = await getFriends();
 */
export function getFriends(
  status: FriendStatus = "accepted",
  signal?: AbortSignal,
): Promise<Friend[]> {
  return requestFriends(`/api/friends/${status}`, signal);
}

/**
 * Загружает друзей выбранного профиля.
 *
 * @param {string} profileId Идентификатор профиля.
 * @param {FriendStatus} [status=\"accepted\"] Нужный статус дружбы.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<Friend[]>} Список друзей или заявок для указанного профиля.
 * @example
 * const friends = await getUserFriends(\"7\");
 */
export function getUserFriends(
  profileId: string,
  status: FriendStatus = "accepted",
  signal?: AbortSignal,
): Promise<Friend[]> {
  const path =
    status === "accepted"
      ? `/api/users/${encodeURIComponent(profileId)}/friends`
      : `/api/friends/${status}`;

  return requestFriends(path, signal);
}

/**
 * Загружает входящие заявки в друзья.
 *
 * @param {FriendStatus} [status=\"pending\"] Нужный статус заявок.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<Friend[]>} Список входящих заявок.
 */
export function getIncomingFriendRequests(
  status: FriendStatus = "pending",
  signal?: AbortSignal,
): Promise<Friend[]> {
  return requestFriends(`/api/friends/requests/incoming/${status}`, signal);
}

/**
 * Загружает исходящие заявки в друзья.
 *
 * @param {FriendStatus} [status=\"pending\"] Нужный статус заявок.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<Friend[]>} Список исходящих заявок.
 */
export function getOutgoingFriendRequests(
  status: FriendStatus = "pending",
  signal?: AbortSignal,
): Promise<Friend[]> {
  return requestFriends(`/api/friends/requests/outgoing/${status}`, signal);
}

/**
 * Отправляет заявку в друзья.
 *
 * @param {string} friendId Идентификатор профиля получателя.
 * @returns {Promise<void>}
 * @example
 * await requestFriendship(\"7\");
 */
export function requestFriendship(friendId: string): Promise<void> {
  return mutateFriendship("/api/friends/request", "POST", { friendID: Number(friendId) });
}

/**
 * Принимает входящую заявку в друзья.
 *
 * @param {string} requesterId Идентификатор отправителя заявки.
 * @returns {Promise<void>}
 */
export function acceptFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(`/api/friends/accept/${encodeURIComponent(requesterId)}`, "POST");
}

/**
 * Отклоняет входящую заявку в друзья.
 *
 * @param {string} requesterId Идентификатор отправителя заявки.
 * @returns {Promise<void>}
 */
export function declineFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(`/api/friends/decline/${encodeURIComponent(requesterId)}`, "POST");
}

/**
 * Отзывает ранее отправленную заявку в друзья.
 *
 * @param {string} addresseeId Идентификатор адресата заявки.
 * @returns {Promise<void>}
 */
export function revokeFriendRequest(addresseeId: string): Promise<void> {
  return mutateFriendship(`/api/friends/request/${encodeURIComponent(addresseeId)}`, "DELETE");
}

/**
 * Удаляет пользователя из друзей.
 *
 * @param {string} friendId Идентификатор профиля друга.
 * @returns {Promise<void>}
 */
export function deleteFriend(friendId: string): Promise<void> {
  return mutateFriendship(`/api/friends/${encodeURIComponent(friendId)}`, "DELETE");
}
