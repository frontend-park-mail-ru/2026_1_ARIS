import type { GameRoomAvatarCaches, GameRoomAvatarServiceOptions } from "./types";

type AvatarMediaLoaderOptions = Pick<GameRoomAvatarServiceOptions, "loadAvatarUrlById"> & {
  caches: GameRoomAvatarCaches;
};

function normalizeAvatarId(avatarId: string): string {
  const value = avatarId.trim();
  return value && Number.isFinite(Number(value)) && Number(value) > 0 ? value : "";
}

/**
 * Загружает публичную ссылку на аватар по media id и кэширует её отдельно от профилей.
 */
export async function loadGameAvatarUrlById(
  options: AvatarMediaLoaderOptions,
  avatarId: string,
  signal?: AbortSignal,
): Promise<string> {
  const mediaId = normalizeAvatarId(avatarId);
  if (!mediaId || !options.loadAvatarUrlById) {
    return "";
  }

  const cachedAvatarUrl = options.caches.gameAvatarMediaUrlCache.get(mediaId);
  if (cachedAvatarUrl) {
    return cachedAvatarUrl;
  }

  try {
    const avatarUrl = (await options.loadAvatarUrlById(mediaId, signal)).trim();
    if (avatarUrl) {
      options.caches.gameAvatarMediaUrlCache.set(mediaId, avatarUrl);
    }
    return avatarUrl;
  } catch {
    return "";
  }
}
