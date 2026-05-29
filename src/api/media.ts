/**
 * API для публичного чтения ссылок на медиа.
 */
import { apiRequest } from "./core/client";

type MediaUrlResponse = {
  mediaID?: number | string;
  mediaId?: number | string;
  media_id?: number | string;
  mediaURL?: string;
  mediaUrl?: string;
  media_url?: string;
  url?: string;
};

/**
 * Возвращает публичную ссылку на медиафайл по его ID.
 */
export async function getMediaUrlById(
  mediaId: string | number,
  signal?: AbortSignal,
): Promise<string> {
  const id = String(mediaId).trim();
  if (!id || !Number.isFinite(Number(id)) || Number(id) <= 0) {
    return "";
  }

  const data = await apiRequest<MediaUrlResponse>(
    `/api/media/${encodeURIComponent(id)}/url`,
    { ...(signal ? { signal } : {}) },
    {},
  );

  return String(data.mediaURL ?? data.mediaUrl ?? data.media_url ?? data.url ?? "").trim();
}
