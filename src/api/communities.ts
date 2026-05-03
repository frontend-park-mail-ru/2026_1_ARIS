/**
 * API для работы с сообществами.
 */
import { apiRequest } from "./core/client";

export type CommunityRole = "owner" | "admin" | "moderator" | "member" | "blocked";
export type CommunityType = "public" | "private";

export type Community = {
  id: number;
  uid: string;
  profileId: number;
  username: string;
  title: string;
  bio?: string;
  type: CommunityType;
  avatarId?: number;
  avatarUrl?: string;
  coverId?: number;
  coverUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityMembership = {
  isMember: boolean;
  role: CommunityRole | "";
  blocked: boolean;
};

export type CommunityPermissions = {
  canEditCommunity: boolean;
  canDeleteCommunity: boolean;
  canPost: boolean;
  canPostAsCommunity: boolean;
  canPostAsMember: boolean;
  canManageMembers: boolean;
  canChangeRoles: boolean;
};

export type CommunityBundle = {
  community: Community;
  membership: CommunityMembership;
  permissions: CommunityPermissions;
};

export type CommunityPayload = {
  title?: string;
  bio?: string;
  type?: CommunityType;
  username?: string;
  avatarId?: number;
  coverId?: number;
  removeAvatar?: boolean;
  removeCover?: boolean;
};

export type CommunityMember = {
  profileId: number;
  userAccountId: number;
  firstName: string;
  lastName: string;
  username: string;
  avatarId?: number;
  avatarUrl?: string;
  role: CommunityRole;
  blocked: boolean;
  isSelf: boolean;
  joinedAt: string;
};

type RawCommunity = {
  id?: number | string;
  uid?: string;
  profileId?: number | string;
  username?: string;
  title?: string;
  bio?: string | null;
  type?: string;
  avatarId?: number | string | null;
  avatarUrl?: string | null;
  coverId?: number | string | null;
  coverUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type RawCommunityMembership = {
  isMember?: boolean;
  role?: string | null;
  blocked?: boolean;
};

type RawCommunityPermissions = {
  canEditCommunity?: boolean;
  canDeleteCommunity?: boolean;
  canPost?: boolean;
  canPostAsCommunity?: boolean;
  canPostAsMember?: boolean;
  canManageMembers?: boolean;
  canChangeRoles?: boolean;
  // legacy
  canEdit?: boolean;
  canDelete?: boolean;
};

type RawCommunityBundle = {
  community?: RawCommunity;
  membership?: RawCommunityMembership | null;
  permissions?: RawCommunityPermissions | null;
};

type CommunitiesResponse = {
  items?: RawCommunityBundle[];
};

type RawCommunityMember = {
  profileId?: number | string;
  userAccountId?: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarId?: number | string | null;
  avatarUrl?: string | null;
  role?: string;
  blocked?: boolean;
  isSelf?: boolean;
  joinedAt?: string;
};

type CommunityMembersResponse = {
  items?: RawCommunityMember[];
};

function isCommunityType(value: unknown): value is CommunityType {
  return value === "public" || value === "private";
}

function normaliseCommunityRole(value: unknown): CommunityRole | "" {
  if (value === "manager") {
    return "moderator";
  }

  if (
    value === "owner" ||
    value === "admin" ||
    value === "moderator" ||
    value === "member" ||
    value === "blocked"
  ) {
    return value;
  }

  return "";
}

function mapOptionalId(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function mapCommunity(raw: RawCommunity | undefined): Community {
  const avatarId = mapOptionalId(raw?.avatarId);
  const coverId = mapOptionalId(raw?.coverId);

  return {
    id: Number(raw?.id ?? 0),
    uid: String(raw?.uid ?? ""),
    profileId: Number(raw?.profileId ?? 0),
    username: String(raw?.username ?? ""),
    title: String(raw?.title ?? ""),
    ...(typeof raw?.bio === "string" ? { bio: raw.bio } : {}),
    type: isCommunityType(raw?.type) ? raw.type : "public",
    ...(avatarId ? { avatarId } : {}),
    ...(raw?.avatarUrl ? { avatarUrl: String(raw.avatarUrl) } : {}),
    ...(coverId ? { coverId } : {}),
    ...(raw?.coverUrl ? { coverUrl: String(raw.coverUrl) } : {}),
    isActive: raw?.isActive !== false,
    createdAt: String(raw?.createdAt ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
  };
}

function mapBundle(raw: RawCommunityBundle): CommunityBundle {
  return {
    community: mapCommunity(raw.community),
    membership: {
      isMember: raw.membership?.isMember === true,
      role: normaliseCommunityRole(raw.membership?.role),
      blocked: raw.membership?.blocked === true,
    },
    permissions: {
      canEditCommunity:
        raw.permissions?.canEditCommunity === true || raw.permissions?.canEdit === true,
      canDeleteCommunity:
        raw.permissions?.canDeleteCommunity === true || raw.permissions?.canDelete === true,
      canPost: raw.permissions?.canPost === true,
      canPostAsCommunity: raw.permissions?.canPostAsCommunity === true,
      canPostAsMember: raw.permissions?.canPostAsMember === true,
      canManageMembers: raw.permissions?.canManageMembers === true,
      canChangeRoles: raw.permissions?.canChangeRoles === true,
    },
  };
}

function mapMember(raw: RawCommunityMember): CommunityMember {
  const avatarId = mapOptionalId(raw.avatarId);

  return {
    profileId: Number(raw.profileId ?? 0),
    userAccountId: Number(raw.userAccountId ?? 0),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    username: String(raw.username ?? ""),
    ...(avatarId ? { avatarId } : {}),
    ...(raw.avatarUrl ? { avatarUrl: String(raw.avatarUrl) } : {}),
    role: normaliseCommunityRole(raw.role) || "member",
    blocked: raw.blocked === true,
    isSelf: raw.isSelf === true,
    joinedAt: String(raw.joinedAt ?? ""),
  };
}

export async function getCommunities(
  limit = 30,
  offset = 0,
  signal?: AbortSignal,
): Promise<CommunityBundle[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ts: String(Date.now()),
  });
  const data = await apiRequest<CommunitiesResponse>(
    `/api/communities?${params.toString()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return Array.isArray(data.items)
    ? data.items.map(mapBundle).filter((item) => item.community.id > 0)
    : [];
}

export async function getCommunityById(
  id: string | number,
  signal?: AbortSignal,
): Promise<CommunityBundle> {
  const data = await apiRequest<RawCommunityBundle>(
    `/api/communities/${encodeURIComponent(String(id))}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );
  return mapBundle(data);
}

export async function getCommunityByProfileId(
  profileId: string | number,
  signal?: AbortSignal,
): Promise<CommunityBundle> {
  const data = await apiRequest<RawCommunityBundle>(
    `/api/communities/by-profile/${encodeURIComponent(String(profileId))}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );
  return mapBundle(data);
}

export async function getCommunityMembers(
  id: string | number,
  includeBlocked = false,
  signal?: AbortSignal,
): Promise<CommunityMember[]> {
  const params = new URLSearchParams({
    includeBlocked: includeBlocked ? "true" : "false",
    ts: String(Date.now()),
  });
  const data = await apiRequest<CommunityMembersResponse>(
    `/api/communities/${encodeURIComponent(String(id))}/members?${params.toString()}`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return Array.isArray(data.items)
    ? data.items.map(mapMember).filter((item) => item.profileId > 0)
    : [];
}

export async function joinCommunity(id: string | number): Promise<CommunityMember> {
  const data = await apiRequest<RawCommunityMember>(
    `/api/communities/${encodeURIComponent(String(id))}/join`,
    { method: "POST" },
    {},
  );
  return mapMember(data);
}

export async function leaveCommunity(id: string | number): Promise<void> {
  await apiRequest<null>(
    `/api/communities/${encodeURIComponent(String(id))}/leave`,
    { method: "POST" },
    null,
  );
}

export async function removeCommunityMember(
  communityId: string | number,
  profileId: string | number,
): Promise<void> {
  await apiRequest<null>(
    `/api/communities/${encodeURIComponent(String(communityId))}/members/${encodeURIComponent(String(profileId))}`,
    { method: "DELETE" },
    null,
  );
}

export async function changeCommunityMemberRole(
  communityId: string | number,
  profileId: string | number,
  role: CommunityRole,
): Promise<CommunityMember> {
  const data = await apiRequest<RawCommunityMember>(
    `/api/communities/${encodeURIComponent(String(communityId))}/members/${encodeURIComponent(String(profileId))}/role`,
    { method: "PATCH", body: { role } },
    {},
  );
  return mapMember(data);
}

export async function createCommunity(payload: CommunityPayload): Promise<CommunityBundle> {
  const data = await apiRequest<RawCommunityBundle>(
    "/api/communities",
    { method: "POST", body: payload },
    {},
  );
  return mapBundle(data);
}

export async function updateCommunity(
  id: string | number,
  payload: CommunityPayload,
): Promise<CommunityBundle> {
  const data = await apiRequest<RawCommunityBundle>(
    `/api/communities/${encodeURIComponent(String(id))}`,
    { method: "PATCH", body: payload },
    {},
  );
  return mapBundle(data);
}

export async function deleteCommunity(id: string | number): Promise<void> {
  await apiRequest<null>(
    `/api/communities/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
    null,
  );
}
