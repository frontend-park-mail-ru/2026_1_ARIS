import type { DisplayProfile } from "./types";

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

  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
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

export function renderAvatar(profile: DisplayProfile, className: string): string {
  if (profile.isMissingProfile) {
    return `
      <div class="${className} ${className}--placeholder" aria-hidden="true">
        ?
      </div>
    `;
  }

  if (profile.avatarLink) {
    return `
      <img
        class="${className}"
        src="${getAvatarImageSrc(profile.avatarLink)}"
        alt="${escapeHtml(`${profile.firstName} ${profile.lastName}`)}"
      >
    `;
  }

  return `
    <div class="${className} ${className}--placeholder" aria-hidden="true">
      ${escapeHtml(getInitials(profile.firstName, profile.lastName))}
    </div>
  `;
}
