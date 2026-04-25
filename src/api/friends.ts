import { ApiError, apiRequest } from "./core/client";

// Повторно экспортируем ApiError для кода, который импортирует его из этого модуля.
export { ApiError };

type RawFriend = {
  avatarID?: number | null;
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

type RawFriendsResponse = {
  friends?: RawFriend[];
};

export type FriendStatus = "pending" | "accepted";

export type Friend = {
  profileId: string;
  firstName: string;
  lastName: string;
  username: string;
  status: FriendStatus;
  avatarLink?: string | undefined;
  createdAt?: string | undefined;
};

function mapFriend(raw: RawFriend): Friend {
  const status = raw.status === "accepted" ? "accepted" : "pending";

  return {
    profileId: String(raw.id ?? raw.profileID ?? ""),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    username: String(raw.username ?? raw.login ?? ""),
    status,
    avatarLink: raw.link ?? undefined,
    createdAt: raw.createdAt ?? undefined,
  };
}

async function requestFriends(path: string): Promise<Friend[]> {
  const data = await apiRequest<RawFriendsResponse>(path, {}, {});

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

export function getFriends(status: FriendStatus = "accepted"): Promise<Friend[]> {
  return requestFriends(`/api/friends/${status}`);
}

export function getUserFriends(
  profileId: string,
  status: FriendStatus = "accepted",
): Promise<Friend[]> {
  const path =
    status === "accepted"
      ? `/api/users/${encodeURIComponent(profileId)}/friends`
      : `/api/friends/${status}`;

  return requestFriends(path);
}

export function getIncomingFriendRequests(status: FriendStatus = "pending"): Promise<Friend[]> {
  return requestFriends(`/api/friends/requests/incoming/${status}`);
}

export function getOutgoingFriendRequests(status: FriendStatus = "pending"): Promise<Friend[]> {
  return requestFriends(`/api/friends/requests/outgoing/${status}`);
}

export function requestFriendship(friendId: string): Promise<void> {
  return mutateFriendship("/api/friends/request", "POST", { friendID: Number(friendId) });
}

export function acceptFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(`/api/friends/accept/${encodeURIComponent(requesterId)}`, "POST");
}

export function declineFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(`/api/friends/decline/${encodeURIComponent(requesterId)}`, "POST");
}

export function revokeFriendRequest(addresseeId: string): Promise<void> {
  return mutateFriendship(`/api/friends/request/${encodeURIComponent(addresseeId)}`, "DELETE");
}

export function deleteFriend(friendId: string): Promise<void> {
  return mutateFriendship(`/api/friends/${encodeURIComponent(friendId)}`, "DELETE");
}
