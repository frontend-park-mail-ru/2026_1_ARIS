/**
 * API для работы с сообществами.
 */
import { apiRequest } from "./core/client";

export type CommunityRole = "owner" | "admin" | "manager" | "moderator" | "member";
export type CommunityType = "public" | "private";

export type Community = {
  id: number;
  uid: string;
  profileId: number;
  username: string;
  title: string;
  bio: string;
  type: CommunityType;
  avatarId?: number;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityMembership = {
  isMember: boolean;
  role: CommunityRole | "";
};

export type CommunityPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canPost: boolean;
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
};

type RawCommunity = Partial<Community> & {
  id?: number | string;
  profileId?: number | string;
  avatarId?: number | string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
};

type RawCommunityBundle = {
  community?: RawCommunity;
  membership?: Partial<CommunityMembership> | null;
  permissions?: Partial<CommunityPermissions> | null;
};

type CommunitiesResponse = {
  items?: RawCommunityBundle[];
};

function isCommunityType(value: unknown): value is CommunityType {
  return value === "public" || value === "private";
}

function mapCommunity(raw: RawCommunity | undefined): Community {
  const avatarId = Number(raw?.avatarId);

  return {
    id: Number(raw?.id ?? 0),
    uid: String(raw?.uid ?? ""),
    profileId: Number(raw?.profileId ?? 0),
    username: String(raw?.username ?? ""),
    title: String(raw?.title ?? ""),
    bio: String(raw?.bio ?? ""),
    type: isCommunityType(raw?.type) ? raw.type : "public",
    ...(Number.isFinite(avatarId) && avatarId > 0 ? { avatarId } : {}),
    ...(raw?.avatarUrl ? { avatarUrl: String(raw.avatarUrl) } : {}),
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
      role: raw.membership?.role ?? "",
    },
    permissions: {
      canEdit: raw.permissions?.canEdit === true,
      canDelete: raw.permissions?.canDelete === true,
      canPost: raw.permissions?.canPost === true,
    },
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
