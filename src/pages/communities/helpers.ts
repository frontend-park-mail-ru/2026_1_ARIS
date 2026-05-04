import type { Community, CommunityBundle, CommunityMember } from "../../api/communities";
import type { PostMedia, PostResponse } from "../../api/posts";
import { t } from "../../state/i18n";
import { getLanguageMode } from "../../state/language";
import { formatPersonName } from "../../utils/display-name";
import type { ProfilePost } from "../profile/types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getCommunityUrl(community: Community): string {
  return `/communities/${encodeURIComponent(String(community.id))}`;
}

export function getCommunityName(community: Community): string {
  return community.title.trim() || community.username.trim() || t("communities.communityFallback");
}

export function getMembersLabel(count: number): string {
  if (getLanguageMode() === "EN") {
    return `${count} ${count === 1 ? "member" : "members"}`;
  }

  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} участников`;
  if (mod10 === 1) return `${count} участник`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} участника`;
  return `${count} участников`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: t("community.role.owner"),
    admin: t("community.role.admin"),
    moderator: t("community.role.moderator"),
    member: t("community.role.member"),
    blocked: t("community.role.blocked"),
  };
  return labels[role] ?? "";
}

function getCommunityRolePriority(role: string): number {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "moderator":
      return 2;
    case "member":
    case "blocked":
      return 1;
    default:
      return 0;
  }
}

export function canManageCommunityMemberRole(
  bundle: CommunityBundle,
  member: CommunityMember,
  viewerProfileId?: number | null,
): boolean {
  if (
    !bundle.permissions.canChangeRoles ||
    member.isSelf ||
    member.profileId === viewerProfileId ||
    member.role === "owner"
  ) {
    return false;
  }

  const actorRole = bundle.membership.role;
  if (actorRole === "moderator" && getCommunityRolePriority(member.role) >= 3) {
    return false;
  }

  return true;
}

export function canRemoveCommunityMember(
  bundle: CommunityBundle,
  member: CommunityMember,
  viewerProfileId?: number | null,
): boolean {
  if (
    !bundle.permissions.canManageMembers ||
    member.isSelf ||
    member.profileId === viewerProfileId ||
    member.role === "owner"
  ) {
    return false;
  }

  const actorRole = bundle.membership.role;
  if (actorRole === "moderator" && getCommunityRolePriority(member.role) >= 3) {
    return false;
  }

  return true;
}

export function getMemberDisplayName(member: CommunityMember): string {
  return (
    formatPersonName(member.firstName, member.lastName, member.username) ||
    t("widgetbar.userFallback")
  );
}

export function getPostAuthorDisplayName(post: ProfilePost): string {
  return (
    formatPersonName(post.authorFirstName, post.authorLastName, post.authorUsername) ||
    t("widgetbar.userFallback")
  );
}

export function slugifyCommunityTitle(value: string): string {
  const translit: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[ъь]/g, "")
    .replace(/[а-яё]/g, (char) => translit[char] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `community-${Date.now()}`;
}

export function formatMemberJoinDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(" г.", " года");
}

export function formatPostRelativeTime(iso?: string): string {
  if (!iso) return "";
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) return "";
  const diff = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t("postcard.justNow");
  if (minutes < 60) return `${minutes} ${t("postcard.minutesAgo")}`;
  if (hours < 24) return `${hours} ${t("postcard.hoursAgo")}`;
  if (days < 30) return `${days} ${t("postcard.daysAgo")}`;
  return new Intl.DateTimeFormat(getLanguageMode() === "EN" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
}

export function formatPostExactTime(iso?: string): string {
  if (!iso) return "";
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) return "";
  const locale = getLanguageMode() === "EN" ? "en-US" : "ru-RU";
  const datePart = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(createdAt);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
  return `${datePart}\n${timePart}`;
}

export function isOfficialCommunityPost(post: PostResponse, bundle: CommunityBundle): boolean {
  const authorProfileId = post.author?.profileID ?? post.profileID;
  return Number(authorProfileId) === bundle.community.profileId;
}

export function mapPostToCommunityPost(
  post: PostResponse,
  bundle: CommunityBundle,
  viewerProfileId: number | null,
): ProfilePost {
  const media = Array.isArray(post.media)
    ? post.media.filter(
        (item): item is PostMedia =>
          Boolean(item) &&
          typeof item.mediaID === "number" &&
          typeof item.mediaURL === "string" &&
          item.mediaURL.trim().length > 0,
      )
    : [];
  const images = Array.isArray(post.mediaURL)
    ? post.mediaURL.filter(Boolean)
    : media.map((item) => item.mediaURL);
  const community = bundle.community;
  const official = isOfficialCommunityPost(post, bundle);
  const authorProfileId = post.author?.profileID ?? post.profileID ?? community.profileId;
  const authorFirstName = official
    ? getCommunityName(community)
    : (post.author?.firstName ?? post.firstName ?? "");
  const authorLastName = official ? "" : (post.author?.lastName ?? post.lastName ?? "");
  const authorUsername = official ? community.username : (post.author?.username ?? "");
  const authorAvatarLink = official
    ? (community.avatarUrl ?? "")
    : (post.author?.avatarURL ?? post.avatarURL ?? "");

  return {
    id: String(post.id),
    authorId: String(authorProfileId),
    authorFirstName,
    authorLastName,
    authorUsername,
    authorAvatarLink,
    isOwnPost: viewerProfileId !== null && Number(authorProfileId) === viewerProfileId,
    text: typeof post.text === "string" ? post.text : "",
    time: formatPostRelativeTime(post.createdAt),
    timeRaw: post.createdAt ?? "",
    ...(post.updatedAt ? { updatedAtRaw: post.updatedAt } : {}),
    likes: post.likes ?? 0,
    isLiked: post.isLiked ?? false,
    reposts: 0,
    comments: 0,
    media,
    images,
  };
}

const POST_EDIT_WINDOW_MS = 10 * 60 * 1000;

export function canEditCommunityPost(
  post: ProfilePost,
  _bundle: CommunityBundle,
  viewerProfileId: number | null,
): boolean {
  if (viewerProfileId === null || Number(post.authorId) !== viewerProfileId) {
    return false;
  }
  const createdAt = new Date(post.timeRaw).getTime();
  return Date.now() - createdAt <= POST_EDIT_WINDOW_MS;
}

export function canDeleteCommunityPost(
  post: ProfilePost,
  bundle: CommunityBundle,
  viewerProfileId: number | null,
): boolean {
  const role = bundle.membership.role;
  if (role === "owner" || role === "admin" || role === "moderator") {
    return true;
  }

  return viewerProfileId !== null && Number(post.authorId) === viewerProfileId;
}
