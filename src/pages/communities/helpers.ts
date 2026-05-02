import type { PostMedia, PostResponse } from "../../api/posts";
import type { Community, CommunityBundle } from "../../api/communities";
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
  return community.title.trim() || community.username.trim() || "Сообщество";
}

export function getMembersLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} участников`;
  if (mod10 === 1) return `${count} участник`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} участника`;
  return `${count} участников`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: "Владелец",
    admin: "Администратор",
    manager: "Менеджер",
    moderator: "Модератор",
    member: "Участник",
  };
  return labels[role] ?? "";
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

export function formatPostRelativeTime(iso?: string): string {
  if (!iso) return "";
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) return "";
  const diff = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 30) return `${days} д назад`;
  return new Intl.DateTimeFormat("ru-RU", {
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
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(createdAt);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
  return `${datePart}\n${timePart}`;
}

export function mapPostToCommunityPost(post: PostResponse, bundle: CommunityBundle): ProfilePost {
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

  return {
    id: String(post.id),
    authorId: String(post.profileID ?? community.profileId),
    authorFirstName: getCommunityName(community),
    authorLastName: "",
    authorUsername: community.username,
    authorAvatarLink: community.avatarUrl ?? "",
    isOwnPost: bundle.permissions.canPost,
    text: typeof post.text === "string" ? post.text : "",
    time: formatPostRelativeTime(post.createdAt),
    timeRaw: post.createdAt ?? "",
    ...(post.updatedAt ? { updatedAtRaw: post.updatedAt } : {}),
    likes: post.likes ?? 0,
    reposts: 0,
    comments: 0,
    media,
    images,
  };
}
