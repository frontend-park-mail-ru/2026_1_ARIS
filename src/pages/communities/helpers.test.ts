/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityBundle, CommunityMember } from "../../api/communities";
import type { PostResponse } from "../../api/posts";
import { applyLanguage, languageStore } from "../../state/language";
import {
  canDeleteCommunityPost,
  canEditCommunityPost,
  canManageCommunityMemberRole,
  canRemoveCommunityMember,
  escapeHtml,
  getCommunityName,
  getCommunityUrl,
  getMembersLabel,
  mapPostToCommunityPost,
  slugifyCommunityTitle,
} from "./helpers";

function createBundle(role: CommunityBundle["membership"]["role"] = "owner"): CommunityBundle {
  return {
    community: {
      id: 10,
      uid: "abc",
      profileId: 100,
      username: "aris",
      title: "ARIS",
      type: "public",
      isActive: true,
      createdAt: "2026-05-01",
      updatedAt: "2026-05-02",
    },
    membership: { isMember: true, role, blocked: false },
    permissions: {
      canEditCommunity: true,
      canDeleteCommunity: true,
      canPost: true,
      canPostAsCommunity: true,
      canPostAsMember: true,
      canManageMembers: true,
      canChangeRoles: true,
    },
  };
}

const member: CommunityMember = {
  profileId: 7,
  userAccountId: 3,
  firstName: "Софья",
  lastName: "Ситниченко",
  username: "sofia",
  role: "member",
  blocked: false,
  isSelf: false,
  joinedAt: "2026-05-04",
};

describe("communities helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
    languageStore.reset({ language: "RU" });
  });

  afterEach(() => {
    vi.useRealTimers();
    languageStore.reset({ language: "RU" });
  });

  it("экранирует HTML, строит URL и fallback имени сообщества", () => {
    expect(escapeHtml(`<b title="x&y">'`)).toBe("&lt;b title=&quot;x&amp;y&quot;&gt;&#39;");
    expect(getCommunityUrl(createBundle().community)).toBe("/communities/10");
    expect(getCommunityName({ ...createBundle().community, title: "", username: "aris" })).toBe(
      "aris",
    );
  });

  it("склоняет количество участников в RU и EN", () => {
    expect(getMembersLabel(1)).toBe("1 участник");
    expect(getMembersLabel(3)).toBe("3 участника");
    expect(getMembersLabel(12)).toBe("12 участников");

    applyLanguage("EN", { persist: false, emit: false });

    expect(getMembersLabel(1)).toBe("1 member");
    expect(getMembersLabel(2)).toBe("2 members");
  });

  it("создаёт slug для кириллицы и fallback для пустого названия", () => {
    expect(slugifyCommunityTitle("  Тестовое Сообщество!  ")).toBe("testovoe-soobschestvo");
    expect(slugifyCommunityTitle("!!!")).toBe("community-1777896000000");
  });

  it("проверяет права управления участниками", () => {
    expect(canManageCommunityMemberRole(createBundle("admin"), member, 1)).toBe(true);
    expect(canRemoveCommunityMember(createBundle("admin"), member, 1)).toBe(true);
    expect(
      canManageCommunityMemberRole(createBundle("moderator"), { ...member, role: "admin" }, 1),
    ).toBe(false);
    expect(canRemoveCommunityMember(createBundle("owner"), { ...member, isSelf: true }, 7)).toBe(
      false,
    );
  });

  it("маппит пост сообщества в ProfilePost и проверяет права редактирования", () => {
    const bundle = createBundle("member");
    const post: PostResponse = {
      id: 55,
      profileID: 7,
      text: "Привет",
      author: {
        profileID: 7,
        firstName: "Софья",
        lastName: "Ситниченко",
        username: "sofia",
        avatarURL: "/media/a.png",
      },
      media: [{ mediaID: 1, mediaURL: "/media/post.png" }],
      createdAt: "2026-05-04T11:55:00.000Z",
      likes: 2,
      isLiked: true,
    };

    const mapped = mapPostToCommunityPost(post, bundle, 7);

    expect(mapped).toMatchObject({
      id: "55",
      authorId: "7",
      authorFirstName: "Софья",
      authorLastName: "Ситниченко",
      authorUsername: "sofia",
      isOwnPost: true,
      likes: 2,
      isLiked: true,
      images: ["/media/post.png"],
    });
    expect(canEditCommunityPost(mapped, bundle, 7)).toBe(true);
    expect(canDeleteCommunityPost(mapped, bundle, 7)).toBe(true);
    expect(canDeleteCommunityPost(mapped, createBundle("moderator"), 1)).toBe(true);
  });
});
