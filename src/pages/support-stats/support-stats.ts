import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { getSessionUser } from "../../state/session";
import { getMyTickets, getSupportStats, type SupportStats, type Ticket } from "../../api/support";

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

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

function renderStats(stats: SupportStats): string {
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

function buildStatsFromTickets(tickets: Ticket[]): SupportStats {
  return tickets.reduce<SupportStats>(
    (acc, ticket) => {
      acc.total += 1;

      if (ticket.status === "open") acc.open += 1;
      if (ticket.status === "in_progress") acc.inProgress += 1;
      if (ticket.status === "waiting_user") acc.waitingUser += 1;
      if (ticket.status === "closed") acc.closed += 1;

      acc.byCategory[ticket.category] += 1;
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
    },
  );
}

// ---------------------------------------------------------------------------
// Рендер страницы
// ---------------------------------------------------------------------------

export async function renderSupportStats(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return `
      <div class="app-page">
        ${renderHeader()}
        <main class="app-layout">
          <aside class="app-layout__left">${renderSidebar({ isAuthorised })}</aside>
          <section class="app-layout__center">
            <div class="ss-page" data-support-stats-page>
              <div class="ss-error"><p>Для просмотра статистики необходимо <a href="/login" data-link>войти в аккаунт</a>.</p></div>
            </div>
          </section>
          <aside class="app-layout__right"></aside>
        </main>
      </div>
    `;
  }

  let statsHtml: string;
  try {
    const stats = await getSupportStats();
    statsHtml = renderStats(stats);
  } catch (error) {
    console.warn("[support-stats] stats endpoint unavailable, fallback to my tickets", error);
    try {
      const tickets = await getMyTickets();
      statsHtml = renderStats(buildStatsFromTickets(tickets));
    } catch (ticketsError) {
      console.error("[support-stats] failed to load tickets for stats", ticketsError);
      statsHtml = `
        <div class="ss-error">
          <p>Не удалось загрузить статистику обращений.</p>
        </div>
      `;
    }
  }

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        <section class="app-layout__center">
          <div class="ss-page" data-support-stats-page>
            <header class="ss-header">
              <h1 class="ss-header__title">Статистика техподдержки</h1>
            </header>
            ${statsHtml}
          </div>
        </section>

        <aside class="app-layout__right"></aside>
      </main>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Инициализация (пока без интерактива — только рендер)
// ---------------------------------------------------------------------------

export function initSupportStats(_root: Document | HTMLElement): void {
  // зарезервировано для будущих фильтров / обновлений
}
