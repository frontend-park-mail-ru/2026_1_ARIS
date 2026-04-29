/**
 * Страница статистики техподдержки.
 *
 * Загружает сводные показатели и показывает fallback на список тикетов,
 * если endpoint статистики временно недоступен.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { getSessionUser } from "../../state/session";
import { canViewAdminPanel } from "../../state/role";
import { getAllTickets, getSupportStats } from "../../api/support";
import { buildStatsFromTickets, renderStats } from "./render";

export async function renderSupportStats(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return `
      <div class="app-page">
        ${renderHeader()}
        <main class="app-layout">
          <aside class="app-layout__left">${renderSidebar({ isAuthorised })}</aside>
          <section class="app-layout__center">
            <div class="ss-page content-card" data-support-stats-page>
              <div class="ss-error"><p>Для просмотра статистики необходимо <a href="/login" data-link>войти в аккаунт</a>.</p></div>
            </div>
          </section>
          <aside class="app-layout__right"></aside>
        </main>
      </div>
    `;
  }

  if (!canViewAdminPanel()) {
    return `
      <div class="app-page">
        ${renderHeader()}
        <main class="app-layout">
          <aside class="app-layout__left">${renderSidebar({ isAuthorised })}</aside>
          <section class="app-layout__center">
            <div class="ss-page content-card" data-support-stats-page>
              <div class="ss-error"><p>Нет доступа к статистике обращений.</p></div>
            </div>
          </section>
          <aside class="app-layout__right"></aside>
        </main>
      </div>
    `;
  }

  let statsHtml: string;
  try {
    const stats = await getSupportStats(signal);
    statsHtml = renderStats(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    console.warn("[support-stats] stats endpoint unavailable, fallback to all tickets", error);
    try {
      const tickets = await getAllTickets(undefined, signal);
      statsHtml = renderStats(buildStatsFromTickets(tickets));
    } catch (ticketsError) {
      if (ticketsError instanceof Error && ticketsError.name === "AbortError") throw ticketsError;
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
          <div class="ss-page content-card" data-support-stats-page>
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

export function initSupportStats(_root: Document | HTMLElement): void {
  // зарезервировано для будущих фильтров / обновлений
}
