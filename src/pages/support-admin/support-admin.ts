import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  assignTicket,
  escalateTicket,
  getAllTickets,
  getTicketById,
  getTicketMessages,
  sendTicketMessage,
  subscribeToTicketMessages,
  updateTicketStatus,
  type Ticket,
  type TicketCategory,
  type TicketFilter,
  type TicketLine,
  type TicketMessage,
  type TicketStatus,
} from "../../api/support";
import { getSessionUser } from "../../state/session";
import { canViewAdminPanel, getSessionRole, isAdmin } from "../../state/role";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: "Баг",
  feature_request: "Предложение",
  complaint: "Жалоба",
  question: "Вопрос",
  other: "Другое",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Открыто",
  in_progress: "В работе",
  waiting_user: "Ожидает пользователя",
  closed: "Закрыто",
};

function escapeHtml(str: string | number): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
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

function getDefaultLine(): TicketLine | undefined {
  const role = getSessionRole();
  if (role === "support_l1") return 1;
  if (role === "support_l2") return 2;
  return undefined;
}

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

function renderTicketList(tickets: Ticket[], activeId = ""): string {
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

function renderTicketPanel(ticket: Ticket): string {
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

function renderChatMessage(message: TicketMessage, currentUserId: string): string {
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
            <div class="sa-page" data-support-admin-page>
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

            <div class="sa-workspace">
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

export async function initSupportAdmin(root: HTMLElement): Promise<void> {
  if (!canViewAdminPanel()) return;

  const user = getSessionUser();
  if (!user) return;

  const filtersForm = root.querySelector<HTMLFormElement>("[data-sa-filters]");
  const statusFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-status]");
  const categoryFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-category]");
  const lineFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-line]");
  const listEl = root.querySelector<HTMLElement>("[data-sa-ticket-list]");
  const panelEl = root.querySelector<HTMLElement>("[data-sa-ticket-panel]");

  let tickets: Ticket[] = [];
  let activeTicketId = "";
  let messageIds = new Set<string>();
  let unsubscribeMessages: (() => void) | null = null;

  const cleanupSocket = (): void => {
    unsubscribeMessages?.();
    unsubscribeMessages = null;
  };

  const setPanelMessage = (message: string): void => {
    if (panelEl) {
      panelEl.innerHTML = `<p class="sa-empty">${escapeHtml(message)}</p>`;
    }
  };

  const getFilters = (): TicketFilter => {
    const filter: TicketFilter = {};
    const status = statusFilter?.value as TicketStatus | "";
    const category = categoryFilter?.value as TicketCategory | "";
    const lineValue = lineFilter?.value;

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (lineValue === "1" || lineValue === "2") filter.line = Number(lineValue) as TicketLine;
    return filter;
  };

  const refreshList = async (): Promise<void> => {
    if (!listEl) return;

    listEl.innerHTML = `<p class="sa-empty">Загрузка тикетов…</p>`;
    try {
      tickets = await getAllTickets(getFilters());
      listEl.innerHTML = renderTicketList(tickets, activeTicketId);
    } catch (error) {
      listEl.innerHTML = `<p class="sa-empty">Не удалось загрузить тикеты.</p>`;
      console.error("[support-admin] load tickets failed", error);
    }
  };

  const appendMessage = (message: TicketMessage): void => {
    if (
      !panelEl ||
      (message.ticketId && message.ticketId !== activeTicketId) ||
      messageIds.has(message.id)
    ) {
      return;
    }

    const messagesEl = panelEl.querySelector<HTMLElement>("[data-sa-chat-messages]");
    if (!messagesEl) return;

    messageIds.add(message.id);
    messagesEl.querySelector("[data-sa-chat-empty]")?.remove();
    messagesEl.insertAdjacentHTML("beforeend", renderChatMessage(message, user.id));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderMessages = (messages: TicketMessage[]): void => {
    const messagesEl = panelEl?.querySelector<HTMLElement>("[data-sa-chat-messages]");
    if (!messagesEl) return;

    messageIds = new Set(messages.map((message) => message.id));
    messagesEl.innerHTML = messages.length
      ? messages.map((message) => renderChatMessage(message, user.id)).join("")
      : `<p class="sa-empty" data-sa-chat-empty>Сообщений пока нет.</p>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const setChatStatus = (message: string): void => {
    const statusEl = panelEl?.querySelector<HTMLElement>("[data-sa-chat-status]");
    if (statusEl) statusEl.textContent = message;
  };

  const setControlsMessage = (message: string): void => {
    const messageEl = panelEl?.querySelector<HTMLElement>("[data-sa-controls-message]");
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.hidden = false;
  };

  const bindPanelControls = (ticket: Ticket): void => {
    const statusSelect = panelEl?.querySelector<HTMLSelectElement>("[data-sa-status]");
    const agentInput = panelEl?.querySelector<HTMLInputElement>("[data-sa-agent-id]");
    const assignButton = panelEl?.querySelector<HTMLButtonElement>("[data-sa-assign]");
    const escalateButton = panelEl?.querySelector<HTMLButtonElement>("[data-sa-escalate]");
    const chatForm = panelEl?.querySelector<HTMLFormElement>("[data-sa-chat-form]");
    const chatInput = panelEl?.querySelector<HTMLTextAreaElement>("[data-sa-chat-input]");
    const chatSubmit = panelEl?.querySelector<HTMLButtonElement>("[data-sa-chat-submit]");

    statusSelect?.addEventListener("change", async () => {
      try {
        await updateTicketStatus(ticket.id, statusSelect.value as TicketStatus);
        setControlsMessage("Статус обновлён.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось обновить статус.");
        console.error("[support-admin] update status failed", error);
      }
    });

    assignButton?.addEventListener("click", async () => {
      const agentId = (agentInput?.value ?? "").trim() || user.id;
      try {
        await assignTicket(ticket.id, agentId);
        setControlsMessage("Агент назначен.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось назначить агента.");
        console.error("[support-admin] assign failed", error);
      }
    });

    escalateButton?.addEventListener("click", async () => {
      try {
        await escalateTicket(ticket.id);
        setControlsMessage("Тикет эскалирован в L2.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось эскалировать тикет.");
        console.error("[support-admin] escalate failed", error);
      }
    });

    chatForm?.addEventListener("submit", async (event: Event) => {
      event.preventDefault();
      const text = (chatInput?.value ?? "").trim();
      if (!text || !chatInput || !chatSubmit) return;

      chatSubmit.disabled = true;
      setChatStatus("");
      try {
        const message = await sendTicketMessage(ticket.id, { text });
        appendMessage({ ...message, ticketId: message.ticketId || ticket.id });
        chatInput.value = "";
      } catch (error) {
        setChatStatus("Не удалось отправить.");
        console.error("[support-admin] send message failed", error);
      } finally {
        chatSubmit.disabled = false;
      }
    });
  };

  const openTicket = async (ticketId: string): Promise<void> => {
    if (!panelEl || !listEl) return;

    cleanupSocket();
    activeTicketId = ticketId;
    messageIds = new Set<string>();
    listEl.innerHTML = renderTicketList(tickets, activeTicketId);
    panelEl.innerHTML = `<p class="sa-empty">Загрузка тикета…</p>`;

    try {
      const cachedTicket = tickets.find((ticket) => ticket.id === ticketId);
      const ticket = cachedTicket?.description ? cachedTicket : await getTicketById(ticketId);
      tickets = tickets.some((item) => item.id === ticket.id)
        ? tickets.map((item) => (item.id === ticket.id ? ticket : item))
        : [...tickets, ticket];
      panelEl.innerHTML = renderTicketPanel(ticket);
      bindPanelControls(ticket);

      try {
        renderMessages(await getTicketMessages(ticket.id));
      } catch (error) {
        renderMessages([]);
        setChatStatus("История недоступна.");
        console.error("[support-admin] load messages failed", error);
      }

      unsubscribeMessages = subscribeToTicketMessages(ticket.id, {
        onMessage: appendMessage,
        onError: () => setChatStatus(""),
      });
    } catch (error) {
      setPanelMessage("Не удалось открыть тикет.");
      console.error("[support-admin] open ticket failed", error);
    }
  };

  filtersForm?.addEventListener("submit", (event: Event) => {
    event.preventDefault();
    activeTicketId = "";
    cleanupSocket();
    setPanelMessage("Выберите тикет из списка.");
    void refreshList();
  });

  listEl?.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const ticketButton = target.closest<HTMLElement>("[data-sa-ticket-id]");
    const ticketId = ticketButton?.getAttribute("data-sa-ticket-id");
    if (ticketId) {
      void openTicket(ticketId);
    }
  });

  await refreshList();
}
