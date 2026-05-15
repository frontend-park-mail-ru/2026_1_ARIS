/**
 * Вспомогательные функции страницы профиля.
 *
 * Содержит локальные утилиты, используемые модулями страницы.
 */
import { API_BASE_URL } from "../../api/config";
import type { DisplayProfile, ProfilePost } from "./types";
import { renderAvatarMarkup, type AvatarOptions } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
import { resolveMediaUrl } from "../../utils/media";
import { t } from "../../state/i18n";

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
  return resolveMediaUrl(avatarLink) || "/assets/img/default-avatar.png";
}

export function getAvatarEditorSrc(avatarLink?: string): string {
  const imageSrc = getAvatarImageSrc(avatarLink);

  if (
    !imageSrc ||
    imageSrc.startsWith("data:") ||
    imageSrc.startsWith("blob:") ||
    imageSrc.startsWith("/image-proxy?url=")
  ) {
    return imageSrc;
  }

  try {
    const parsed = new URL(imageSrc, window.location.origin);
    const apiBase = API_BASE_URL ? new URL(API_BASE_URL, window.location.origin) : null;
    const isBackendMedia =
      parsed.pathname.startsWith("/media/") &&
      (!!apiBase
        ? parsed.origin === apiBase.origin || imageSrc.startsWith(`${API_BASE_URL}/media/`)
        : parsed.origin === window.location.origin);

    if (isBackendMedia) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Ниже останется безопасный fallback.
  }

  return imageSrc;
}

export function hasVisibleValue(value?: string): boolean {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "Не указано";
}

const POST_EDIT_WINDOW_MS = 10 * 60 * 1000;

export function canEditProfilePost(post: ProfilePost): boolean {
  const createdAt = new Date(post.timeRaw).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt <= POST_EDIT_WINDOW_MS;
}

export function renderAvatar(
  profile: DisplayProfile,
  className: string,
  options: AvatarOptions = {},
): string {
  const label = profile.isMissingProfile
    ? t("profile.profile")
    : formatPersonName(profile.firstName, profile.lastName, profile.username) ||
      t("widgetbar.userFallback");

  return renderAvatarMarkup(className, label, profile.avatarLink, options);
}
