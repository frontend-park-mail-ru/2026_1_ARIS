/**
 * Возвращает ссылку на аватар из разных вариантов серверного payload.
 */
export function getProfileAvatarLink(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const raw = profile as Record<string, unknown>;
  const avatarLink = String(
    raw.imageLink ??
      raw.avatarLink ??
      raw.avatarUrl ??
      raw.avatarURL ??
      raw.profileAvatarUrl ??
      raw.photoUrl ??
      "",
  ).trim();
  if (avatarLink) return avatarLink;
  return "";
}
