/**
 * Вспомогательные функции страницы профиля.
 *
 * Содержит локальные утилиты, используемые модулями страницы.
 */
import { API_BASE_URL } from "../../api/config";
import type { DisplayProfile } from "./types";
import { renderAvatarMarkup, type AvatarOptions } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
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

  return `/image-proxy?url=${encodeURIComponent(imageSrc)}`;
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
    ? t("profile.profile")
    : formatPersonName(profile.firstName, profile.lastName, profile.username) ||
      t("widgetbar.userFallback");

  return renderAvatarMarkup(className, label, profile.avatarLink, options);
}
