/**
 * Вспомогательные функции страницы поддержки.
 *
 * Содержит локальные утилиты, используемые модулями страницы.
 */
import type { TicketCategory, TicketStatus } from "../../api/support";
import { getLanguageMode } from "../../state/language";
import { t, type TranslationKey } from "../../state/i18n";

export const CATEGORY_LABEL_KEYS: Record<TicketCategory, TranslationKey> = {
  bug: "support.category.bug",
  feature_request: "support.category.feature_request",
  complaint: "support.category.complaint",
  question: "support.category.question",
  other: "support.category.other",
};

export const STATUS_LABEL_KEYS: Record<TicketStatus, TranslationKey> = {
  open: "support.status.open",
  in_progress: "support.status.in_progress",
  waiting_user: "support.status.waiting_user",
  closed: "support.status.closed",
};

export function getCategoryLabel(category: TicketCategory): string {
  return t(CATEGORY_LABEL_KEYS[category]);
}

export function getStatusLabel(status: TicketStatus): string {
  return t(STATUS_LABEL_KEYS[status]);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDate(iso: string): string {
  if (!iso) return "";

  try {
    return new Intl.DateTimeFormat(getLanguageMode() === "EN" ? "en-US" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function showError(el: HTMLElement, msg: string): void {
  el.textContent = msg;
  el.hidden = false;
}

export function hideError(el: HTMLElement): void {
  el.textContent = "";
  el.hidden = true;
}
