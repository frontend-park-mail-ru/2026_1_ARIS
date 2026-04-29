import type { SupportStats, Ticket } from "../../api/support";

function escapeHtml(str: string | number): string {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderStatCard(label: string, value: string | number, accent = false): string {
  return `
    <div class="ss-card${accent ? " ss-card--accent" : ""}">
      <span class="ss-card__value">${escapeHtml(value)}</span>
      <span class="ss-card__label">${escapeHtml(label)}</span>
    </div>
  `;
}

export function renderStats(stats: SupportStats): string {
  const avgRating = stats.avgRating === null ? "—" : stats.avgRating.toFixed(1);

  return `
    <section class="ss-section">
      <h2 class="ss-section__title">Общая статистика</h2>
      <div class="ss-grid">
        ${renderStatCard("Всего обращений", stats.total, true)}
        ${renderStatCard("Открыто", stats.open)}
        ${renderStatCard("В работе", stats.inProgress)}
        ${renderStatCard("Ожидают ответа", stats.waitingUser)}
        ${renderStatCard("Закрыто", stats.closed)}
      </div>
    </section>

    <section class="ss-section">
      <h2 class="ss-section__title">Линии и качество</h2>
      <div class="ss-grid">
        ${renderStatCard("1-я линия", stats.byLine.l1)}
        ${renderStatCard("2-я линия", stats.byLine.l2)}
        ${renderStatCard("Средняя оценка", avgRating, true)}
        ${renderStatCard("Оценка 5", stats.ratingDistribution["5"])}
        ${renderStatCard("Оценка 1", stats.ratingDistribution["1"])}
      </div>
    </section>

    <section class="ss-section">
      <h2 class="ss-section__title">По категориям</h2>
      <div class="ss-grid">
        ${renderStatCard("Баги", stats.byCategory.bug)}
        ${renderStatCard("Предложения", stats.byCategory.feature_request)}
        ${renderStatCard("Жалобы", stats.byCategory.complaint)}
        ${renderStatCard("Вопросы", stats.byCategory.question)}
        ${renderStatCard("Другое", stats.byCategory.other)}
      </div>
    </section>
  `;
}

export function buildStatsFromTickets(tickets: Ticket[]): SupportStats {
  const stats = tickets.reduce<SupportStats>(
    (acc, ticket) => {
      acc.total += 1;

      if (ticket.status === "open") acc.open += 1;
      if (ticket.status === "in_progress") acc.inProgress += 1;
      if (ticket.status === "waiting_user") acc.waitingUser += 1;
      if (ticket.status === "closed") acc.closed += 1;

      acc.byCategory[ticket.category] += 1;
      acc.byLine[ticket.line === 2 ? "l2" : "l1"] += 1;

      if (typeof ticket.rating === "number" && ticket.rating >= 1 && ticket.rating <= 5) {
        const key = String(ticket.rating) as keyof SupportStats["ratingDistribution"];
        acc.ratingDistribution[key] += 1;
      }

      return acc;
    },
    {
      total: 0,
      open: 0,
      inProgress: 0,
      waitingUser: 0,
      closed: 0,
      byCategory: {
        bug: 0,
        feature_request: 0,
        complaint: 0,
        question: 0,
        other: 0,
      },
      byLine: {
        l1: 0,
        l2: 0,
      },
      avgRating: null,
      ratingDistribution: {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
      },
    },
  );

  const ratings = tickets
    .map((ticket) => ticket.rating)
    .filter((rating): rating is number => typeof rating === "number" && rating >= 1 && rating <= 5);

  if (ratings.length) {
    stats.avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  return stats;
}
