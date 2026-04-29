import type { TicketCategory, TicketStatus } from "../../api/support";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: "Баг",
  feature_request: "Предложение",
  complaint: "Жалоба",
  question: "Вопрос",
  other: "Другое",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Открыто",
  in_progress: "В работе",
  waiting_user: "Ожидает вас",
  closed: "Закрыто",
};

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
    return new Intl.DateTimeFormat("ru-RU", {
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
