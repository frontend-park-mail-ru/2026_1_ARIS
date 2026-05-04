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

export type SearchResponse = {
  users: SearchUser[];
  communities: SearchCommunity[];
};

const SEARCH_LIMIT = 20;

export async function searchUsersAndCommunities(
  q: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(SEARCH_LIMIT) });
  return apiRequest<SearchResponse>(`/api/search?${params.toString()}`, signal ? { signal } : {}, {
    users: [],
    communities: [],
  });
}
