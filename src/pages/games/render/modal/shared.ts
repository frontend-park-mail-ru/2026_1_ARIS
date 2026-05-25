import { escapeHtml } from "../../../../utils/avatar";

/**
 * Рендерит inline-ошибку внутри модалок.
 */
export function renderModalError(error: string): string {
  return error ? `<p class="games-inline-error">${escapeHtml(error)}</p>` : "";
}
