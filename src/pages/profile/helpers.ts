import type { DisplayProfile } from "./types";
import { renderAvatarMarkup, type AvatarOptions } from "../../utils/avatar";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getAvatarImageSrc(avatarLink?: string): string {
  if (!avatarLink) {
    return "/assets/img/default-avatar.png";
  }

  if (
    avatarLink.startsWith("/image-proxy?url=") ||
    avatarLink.startsWith("data:") ||
    avatarLink.startsWith("blob:") ||
    /^https?:\/\//i.test(avatarLink)
  ) {
    return avatarLink;
  }

  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
}

export function hasVisibleValue(value?: string): boolean {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "Не указано";
}

export function renderAvatar(
  profile: DisplayProfile,
  className: string,
  options: AvatarOptions = {},
): string {
  const label = profile.isMissingProfile
    ? "Профиль"
    : `${profile.firstName} ${profile.lastName}`.trim() || "Пользователь";

  return renderAvatarMarkup(className, label, profile.avatarLink, options);
}
