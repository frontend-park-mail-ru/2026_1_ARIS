import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CommunityMember } from "../../api/communities";
import { communitiesState, getVisibleCommunityMembers, resetCommunitiesState } from "./state";

const regularMember: CommunityMember = {
  profileId: 1,
  userAccountId: 11,
  firstName: "Олег",
  lastName: "Владелец",
  username: "owner",
  role: "owner",
  blocked: false,
  isSelf: false,
  joinedAt: "2026-05-01",
};

const blockedMember: CommunityMember = {
  profileId: 2,
  userAccountId: 12,
  firstName: "Антон",
  lastName: "Заблокированный",
  username: "blocked",
  role: "blocked",
  blocked: true,
  isSelf: false,
  joinedAt: "2026-05-02",
};

describe("communities state", () => {
  beforeEach(() => {
    resetCommunitiesState();
    communitiesState.activeMembers = [regularMember, blockedMember];
  });

  afterEach(() => {
    resetCommunitiesState();
  });

  it("показывает только заблокированных при включенном фильтре", () => {
    expect(getVisibleCommunityMembers().map((member) => member.profileId)).toEqual([1]);

    communitiesState.membersManager.includeBlocked = true;

    expect(getVisibleCommunityMembers().map((member) => member.profileId)).toEqual([2]);
  });

  it("ищет участников внутри текущего режима фильтра", () => {
    communitiesState.membersManager.query = "антон";
    expect(getVisibleCommunityMembers()).toEqual([]);

    communitiesState.membersManager.includeBlocked = true;

    expect(getVisibleCommunityMembers().map((member) => member.profileId)).toEqual([2]);
  });
});
