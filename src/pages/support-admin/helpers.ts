/**
 * Вспомогательные функции страницы админки поддержки.
 *
 * Содержит локальные утилиты, используемые модулями страницы.
 */
import type { TicketCategory, TicketLine, TicketStatus } from "../../api/support";
import { getSessionRole } from "../../state/role";

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
  waiting_user: "Ожидает пользователя",
  closed: "Закрыто",
};

export function escapeHtml(str: string | number): string {
  return String(str)
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

export function getDefaultLine(): TicketLine | undefined {
  const role = getSessionRole();
  if (role === "support_l1") return 1;
  if (role === "support_l2") return 2;
  return undefined;
}
