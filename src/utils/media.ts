/**
 * Нормализация ссылок на медиа.
 *
 * Приводит относительные и неполные значения к виду, пригодному для рендера в UI.
 */
import { API_BASE_URL } from "../api/config";

const EMPTY_MEDIA_VALUES = new Set(["", "null", "undefined", "none"]);

function getImageProxyTarget(value: string): string {
  if (!value.startsWith("/image-proxy?url=")) {
    return "";
  }

  try {
    return new URL(value, window.location.origin).searchParams.get("url")?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Возвращает итоговый URL медиафайла для интерфейса.
 *
 * @param {string | null | undefined} [rawValue] Исходное значение из API.
 * @returns {string} Нормализованный URL или пустая строка.
 */
export function resolveMediaUrl(rawValue?: string | null): string {
  const value = String(rawValue ?? "").trim();
  const normalized = value.toLowerCase();

  if (!value || EMPTY_MEDIA_VALUES.has(normalized)) {
    return "";
  }

  const imageProxyTarget = getImageProxyTarget(value);
  if (imageProxyTarget && imageProxyTarget !== value) {
    return resolveMediaUrl(imageProxyTarget);
  }

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `${window.location.protocol}${value}`;
  }

  if (value.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }

  return API_BASE_URL ? `${API_BASE_URL}/${value.replace(/^\.?\//, "")}` : value;
}
