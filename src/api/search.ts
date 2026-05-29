import { apiRequest } from "./core/client";

export type SearchUser = {
  profileId: number;
  userAccountId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatarId?: number;
  avatarUrl?: string;
};

export type SearchCommunity = {
  id: number;
  profileId: number;
  username: string;
  title: string;
  bio?: string;
  type: string;
  avatarId?: number;
  avatarUrl?: string;
  coverId?: number;
  coverUrl?: string;
};

export type SearchPost = {
  id: number;
  text: string;
  authorId: number;
  authorProfileId: number;
  authorUsername: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarId?: number;
  authorAvatarUrl?: string;
  communityId?: number;
  createdAt: string;
};

export type SearchResponse = {
  users: SearchUser[];
  communities: SearchCommunity[];
  posts: SearchPost[];
};

type RawSearchResponse = {
  users?: SearchUser[] | null;
  communities?: SearchCommunity[] | null;
  posts?: SearchPost[] | null;
};

const SEARCH_LIMIT = 20;

function normalizeSearchList<T>(items: T[] | null | undefined): T[] {
  return Array.isArray(items) ? items : [];
}

function normalizeSearchResponse(response: RawSearchResponse | null | undefined): SearchResponse {
  return {
    users: normalizeSearchList(response?.users),
    communities: normalizeSearchList(response?.communities),
    posts: normalizeSearchList(response?.posts),
  };
}

export async function searchUsersAndCommunities(
  q: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(SEARCH_LIMIT) });
  const response = await apiRequest<RawSearchResponse>(
    `/api/search?${params.toString()}`,
    signal ? { signal } : {},
    {
      users: [],
      communities: [],
      posts: [],
    },
  );
  return normalizeSearchResponse(response);
}
