import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  changeCommunityMemberRole,
  checkCommunityExists,
  createCommunity,
  deleteCommunity,
  getCommunities,
  getCommunityMembers,
  joinCommunity,
  leaveCommunity,
  removeCommunityMember,
  updateCommunity,
} from "./communities";

vi.mock("./core/client", () => ({
  apiRequest: vi.fn(),
}));

describe("communities api", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("нормализует список групп, роли и legacy permissions", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [
        {
          community: {
            id: "10",
            uid: "abc",
            profileId: "100",
            username: "aris",
            title: "ARIS",
            bio: "Команда",
            type: "secret",
            avatarId: "5",
            coverId: "6",
            isActive: undefined,
            createdAt: "2026-05-01",
            updatedAt: "2026-05-02",
          },
          membership: { isMember: true, role: "manager", blocked: false },
          permissions: { canEdit: true, canDelete: true, canPost: true },
        },
        { community: { id: 0 } },
      ],
    });

    await expect(getCommunities(2, 5)).resolves.toEqual([
      {
        community: {
          id: 10,
          uid: "abc",
          profileId: 100,
          username: "aris",
          title: "ARIS",
          bio: "Команда",
          type: "public",
          avatarId: 5,
          coverId: 6,
          isActive: true,
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
        membership: { isMember: true, role: "moderator", blocked: false },
        permissions: {
          canEditCommunity: true,
          canDeleteCommunity: true,
          canPost: true,
          canPostAsCommunity: false,
          canPostAsMember: false,
          canManageMembers: false,
          canChangeRoles: false,
        },
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/communities?limit=2&offset=5&ts=1777896000000",
      {},
      {},
    );
  });

  it("нормализует участников группы", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [
        {
          profileId: "7",
          userAccountId: "3",
          firstName: "Софья",
          lastName: "Ситниченко",
          username: "sofia",
          avatarId: "11",
          role: "owner",
          blocked: true,
          isSelf: true,
          joinedAt: "2026-05-04",
        },
        { profileId: 0 },
      ],
    });

    await expect(getCommunityMembers("community id", true)).resolves.toEqual([
      {
        profileId: 7,
        userAccountId: 3,
        firstName: "Софья",
        lastName: "Ситниченко",
        username: "sofia",
        avatarId: 11,
        role: "owner",
        blocked: true,
        isSelf: true,
        joinedAt: "2026-05-04",
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/communities/community%20id/members?includeBlocked=true&ts=1777896000000",
      {},
      {},
    );
  });

  it("передаёт параметры пагинации при загрузке участников", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] });

    await expect(getCommunityMembers(10, false, undefined, 30, 60)).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/communities/10/members?includeBlocked=false&ts=1777896000000&limit=30&offset=60",
      {},
      {},
    );
  });

  it("проверяет занятость названия и адреса группы", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      exists: true,
      titleExists: true,
      usernameExists: false,
      suggestedUsername: "aris-2",
    });

    await expect(checkCommunityExists({ title: "ARIS", username: "aris" })).resolves.toEqual({
      exists: true,
      titleExists: true,
      usernameExists: false,
      suggestedUsername: "aris-2",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/communities/check-exists",
      { method: "POST", body: { title: "ARIS", username: "aris" } },
      {},
    );
  });

  it("вызывает endpoints членства и CRUD группы", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ profileId: 7, userAccountId: 3, role: "member" });

    await joinCommunity(10);
    await leaveCommunity(10);
    await removeCommunityMember(10, "profile id");
    await changeCommunityMemberRole(10, 7, "admin");
    await createCommunity({ title: "New" });
    await updateCommunity(10, { title: "Updated" });
    await deleteCommunity(10);

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/communities/10/join",
      { method: "POST" },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/communities/10/leave",
      { method: "POST" },
      null,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/communities/10/members/profile%20id",
      { method: "DELETE" },
      null,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/communities/10/members/7/role",
      { method: "PATCH", body: { role: "admin" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      "/api/communities",
      { method: "POST", body: { title: "New" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      6,
      "/api/communities/10",
      { method: "PATCH", body: { title: "Updated" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      7,
      "/api/communities/10",
      { method: "DELETE" },
      null,
    );
  });
});
