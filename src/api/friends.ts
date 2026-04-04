import { ApiError } from "./auth";

type ErrorResponse = {
  error?: string;
};

type RawFriend = {
  avatarID?: number | null;
  profileID?: number | string;
  firstName?: string;
  lastName?: string;
  login?: string;
  status?: string;
  link?: string | null;
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
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    const errorMatch = text.match(/"error"\s*:\s*"([^"]+)"/);

    return {
      error: errorMatch?.[1] || text || "invalid server response",
    } as T;
  }
}

function createApiError(
  fallbackMessage: string,
  status: number,
  data: ErrorResponse | unknown,
): ApiError {
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ErrorResponse).error === "string"
      ? (data as ErrorResponse).error!
      : fallbackMessage;

  return new ApiError(message, status, data);
}

function mapFriend(raw: RawFriend): Friend {
  const status = raw.status === "accepted" ? "accepted" : "pending";

  return {
    profileId: String(raw.profileID ?? ""),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    username: String(raw.login ?? ""),
    status,
    avatarLink: raw.link ?? undefined,
  };
}

async function requestFriends(path: string, fallbackMessage: string): Promise<Friend[]> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<RawFriendsResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError(fallbackMessage, response.status, data);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("friends" in data) ||
    !Array.isArray((data as RawFriendsResponse).friends)
  ) {
    return [];
  }

  return ((data as RawFriendsResponse).friends ?? [])
    .map(mapFriend)
    .filter((friend) => Boolean(friend.profileId));
}

async function mutateFriendship(
  path: string,
  method: "DELETE" | "POST",
  fallbackMessage: string,
  payload?: unknown,
): Promise<void> {
  const requestInit: RequestInit = {
    method,
    credentials: "include",
  };

  if (payload) {
    requestInit.headers = {
      "Content-Type": "application/json",
    };
    requestInit.body = JSON.stringify(payload);
  }

  const response = await fetch(path, requestInit);

  const data = await parseJson<ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError(fallbackMessage, response.status, data);
  }
}

export function getFriends(status: FriendStatus = "accepted"): Promise<Friend[]> {
  return requestFriends(`/api/friends/${status}`, "failed to load friends");
}

export function getIncomingFriendRequests(status: FriendStatus = "pending"): Promise<Friend[]> {
  return requestFriends(
    `/api/friends/requests/incoming/${status}`,
    "failed to load incoming friend requests",
  );
}

export function getOutgoingFriendRequests(status: FriendStatus = "pending"): Promise<Friend[]> {
  return requestFriends(
    `/api/friends/requests/outgoing/${status}`,
    "failed to load outgoing friend requests",
  );
}

export function requestFriendship(friendId: string): Promise<void> {
  return mutateFriendship("/api/friends/request", "POST", "failed to send friend request", {
    friendID: Number(friendId),
  });
}

export function acceptFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(
    `/api/friends/accept/${encodeURIComponent(requesterId)}`,
    "POST",
    "failed to accept friend request",
  );
}

export function declineFriendRequest(requesterId: string): Promise<void> {
  return mutateFriendship(
    `/api/friends/decline/${encodeURIComponent(requesterId)}`,
    "POST",
    "failed to decline friend request",
  );
}

export function revokeFriendRequest(addresseeId: string): Promise<void> {
  return mutateFriendship(
    `/api/friends/request/${encodeURIComponent(addresseeId)}`,
    "DELETE",
    "failed to revoke friend request",
  );
}

export function deleteFriend(friendId: string): Promise<void> {
  return mutateFriendship(
    `/api/friends/${encodeURIComponent(friendId)}`,
    "DELETE",
    "failed to delete friend",
  );
}
