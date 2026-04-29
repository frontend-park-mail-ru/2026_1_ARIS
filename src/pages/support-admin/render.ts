import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import type { Ticket, TicketLine, TicketMessage } from "../../api/support";
import { getSessionUser } from "../../state/session";
import { canViewAdminPanel, getSessionRole, isAdmin } from "../../state/role";
import { CATEGORY_LABELS, STATUS_LABELS, escapeHtml, formatDate, getDefaultLine } from "./helpers";

function renderCategoryOptions(): string {
  return `
    <option value="">Все категории</option>
    ${Object.entries(CATEGORY_LABELS)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("")}
  `;
}

function renderStatusOptions(): string {
  return `
    <option value="">Все статусы</option>
    ${Object.entries(STATUS_LABELS)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("")}
  `;
}

function renderLineOptions(defaultLine?: TicketLine): string {
  const canChangeLine = isAdmin();
  return `
    <option value=""${defaultLine ? "" : " selected"}${canChangeLine ? "" : " disabled"}>Все линии</option>
    <option value="1"${defaultLine === 1 ? " selected" : ""}${canChangeLine || defaultLine === 1 ? "" : " disabled"}>1-я линия</option>
    <option value="2"${defaultLine === 2 ? " selected" : ""}${canChangeLine || defaultLine === 2 ? "" : " disabled"}>2-я линия</option>
  `;
}

export function renderTicketList(tickets: Ticket[], activeId = ""): string {
  if (!tickets.length) {
    return `<p class="sa-empty">Тикетов в очереди нет.</p>`;
  }

  return tickets
    .map(
      (ticket) => `
        <button type="button" class="sa-ticket${ticket.id === activeId ? " sa-ticket--active" : ""}" data-sa-ticket-id="${escapeHtml(ticket.id)}">
          <span class="sa-ticket__top">
            <span class="sa-pill">L${ticket.line}</span>
            <span class="sa-status sa-status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status])}</span>
          </span>
          <strong>${escapeHtml(ticket.title)}</strong>
          <span>${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)} · ${formatDate(ticket.createdAt)}</span>
        </button>
      `,
    )
    .join("");
}

export function renderTicketPanel(ticket: Ticket): string {
  const canEscalate = (getSessionRole() === "support_l1" || isAdmin()) && ticket.line === 1;

  return `
    <article class="sa-detail" data-sa-active-ticket="${escapeHtml(ticket.id)}">
      <header class="sa-detail__header">
        <div>
          <div class="sa-detail__meta">
            <span class="sa-pill">L${ticket.line}</span>
            <span class="sa-status sa-status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status])}</span>
            <span>${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)}</span>
          </div>
          <h2>${escapeHtml(ticket.title)}</h2>
          <time>${formatDate(ticket.createdAt)}</time>
        </div>
      </header>

      <p class="sa-detail__description">${escapeHtml(ticket.description)}</p>
      ${renderTicketAttachments(ticket)}

      <section class="sa-controls">
        <label>
          <span>Статус</span>
          <select data-sa-status>
            ${Object.entries(STATUS_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}"${ticket.status === value ? " selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>ID агента</span>
          <input type="text" value="${escapeHtml(ticket.assignedAgentId ?? "")}" data-sa-agent-id placeholder="agent id">
        </label>
        <div class="sa-controls__actions">
          <button type="button" class="sa-btn sa-btn--ghost" data-sa-assign>Назначить</button>
          ${
            canEscalate
              ? `<button type="button" class="sa-btn sa-btn--danger" data-sa-escalate>Эскалировать в L2</button>`
              : ""
          }
        </div>
        <p class="sa-controls__message" data-sa-controls-message hidden></p>
      </section>

      <section class="sa-chat">
        <div class="sa-chat__header">
          <h3>Чат обращения</h3>
          <span data-sa-chat-status></span>
        </div>
        <div class="sa-chat__messages" data-sa-chat-messages>
          <p class="sa-empty">Загрузка сообщений…</p>
        </div>
        <form class="sa-chat__form" data-sa-chat-form>
          <textarea data-sa-chat-input rows="3" maxlength="2000" placeholder="Ответить пользователю" required></textarea>
          <button type="submit" class="sa-btn sa-btn--primary" data-sa-chat-submit>Отправить</button>
        </form>
      </section>
    </article>
  `;
}

function renderTicketAttachments(ticket: Ticket): string {
  if (!ticket.media.length) {
    return "";
  }

  return `
    <section class="sa-attachments" aria-label="Вложения">
      <h3>Скриншот</h3>
      <div class="sa-attachments__grid">
        ${ticket.media
          .map(
            (media) => `
              <a class="sa-attachment" href="${escapeHtml(media.mediaURL)}" target="_blank" rel="noopener noreferrer">
                <img src="${escapeHtml(media.mediaURL)}" alt="Скриншот обращения" loading="lazy">
              </a>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderChatMessage(message: TicketMessage, currentUserId: string): string {
  const isOwn = message.authorId === currentUserId;

  return `
    <article class="sa-msg${isOwn ? " sa-msg--own" : ""}" data-message-id="${escapeHtml(message.id)}">
      <div class="sa-msg__bubble">
        <div class="sa-msg__meta">
          <span>${escapeHtml(message.authorName)}</span>
          <time>${formatDate(message.createdAt)}</time>
        </div>
        <p>${escapeHtml(message.text)}</p>
      </div>
    </article>
  `;
}

export async function renderSupportAdmin(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!canViewAdminPanel()) {
    return `
      <div class="app-page">
        ${renderHeader()}
        <main class="app-layout">
          <aside class="app-layout__left">${renderSidebar({ isAuthorised })}</aside>
          <section class="app-layout__center">
            <div class="sa-page content-card" data-support-admin-page>
              <div class="sa-access"><p>Нет доступа к панели обращений.</p></div>
            </div>
          </section>
          <aside class="app-layout__right"></aside>
        </main>
      </div>
    `;
  }

  const defaultLine = getDefaultLine();

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">${renderSidebar({ isAuthorised })}</aside>
        <section class="app-layout__center app-layout__center--wide">
          <div class="sa-page" data-support-admin-page>
            <header class="sa-header">
              <h1>Тикеты поддержки</h1>
            </header>

            <form class="sa-filters" data-sa-filters>
              <select data-sa-filter-status>${renderStatusOptions()}</select>
              <select data-sa-filter-category>${renderCategoryOptions()}</select>
              <select data-sa-filter-line>${renderLineOptions(defaultLine)}</select>
              <button type="submit" class="sa-btn sa-btn--primary">Обновить</button>
            </form>

            <div class="sa-workspace content-card">
              <aside class="sa-list" data-sa-ticket-list>
                <p class="sa-empty">Загрузка тикетов…</p>
              </aside>
              <section class="sa-panel" data-sa-ticket-panel>
                <p class="sa-empty">Выберите тикет из списка.</p>
              </section>
            </div>
          </div>
        </section>
        <aside class="app-layout__right"></aside>
      </main>
    </div>
  `;
}
